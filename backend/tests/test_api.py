"""Integration tests: real FastAPI app against a real Postgres (see conftest.py)."""

from datetime import timedelta
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from app.core.database import sync_engine
from app.model.analysis_job import AnalysisJob
from app.model.auth import AuthSession
from app.model.media_items import MediaItem
from app.model.media_metrics import MediaMetric
from app.model.user import User
from app.utils.time import utc_now
from tests.conftest import make_client

PASSWORD = "Secret1!"
NEW_PASSWORD = "Better2@"


async def signup(client, email="creator@example.com", password=PASSWORD):
    response = await client.post(
        "/api/v1/auth/signup", json={"name": "Creator", "email": email, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()


def _user_id(email="creator@example.com"):
    with Session(sync_engine) as db:
        return db.exec(select(User).where(User.email == email)).one().id


# ---------- auth basics ----------

async def test_signup_sets_cookies_and_starts_unverified(client, sent_emails):
    body = await signup(client)
    assert body["email_verified"] is False
    assert "access_token" in client.cookies and "refresh_token" in client.cookies
    assert [e["kind"] for e in sent_emails] == ["verify"]

    profile = await client.get("/api/v1/auth/profile")
    assert profile.status_code == 200 and profile.json()["email"] == "creator@example.com"


async def test_login_rejects_wrong_password(client, sent_emails):
    await signup(client)
    response = await client.post("/api/v1/auth/login", json={"email": "creator@example.com", "password": "Wrong1!x"})
    assert response.status_code == 401


async def test_invalid_access_token_is_401_not_500(client):
    client.cookies.set("access_token", "garbage")
    response = await client.get("/api/v1/auth/profile")
    assert response.status_code == 401


# ---------- refresh rotation ----------

async def test_refresh_rotates_and_old_token_is_rejected(client, sent_emails):
    await signup(client)
    old_refresh = client.cookies.get("refresh_token")

    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200 and response.json() == {"message": "Token refreshed"}
    assert client.cookies.get("refresh_token") != old_refresh

    # Regression: with bcrypt over a 72-byte JWT prefix, a revoked token still validated.
    async with make_client() as attacker:
        attacker.cookies.set("refresh_token", old_refresh)
        assert (await attacker.post("/api/v1/auth/refresh")).status_code == 401


async def test_two_devices_refresh_independently_and_logout_is_per_device(client, sent_emails):
    await signup(client)
    async with make_client() as laptop:
        login = await laptop.post("/api/v1/auth/login", json={"email": "creator@example.com", "password": PASSWORD})
        assert login.status_code == 200

        assert (await client.post("/api/v1/auth/refresh")).status_code == 200
        assert (await laptop.post("/api/v1/auth/refresh")).status_code == 200

        assert (await laptop.post("/api/v1/auth/logout")).status_code == 200
        assert (await client.post("/api/v1/auth/refresh")).status_code == 200


# ---------- email verification ----------

async def test_verify_email_flow(client, sent_emails):
    await signup(client)
    token = sent_emails[-1]["token"]

    async with make_client() as anonymous:
        response = await anonymous.post("/api/v1/auth/email/verify", json={"token": token})
        assert response.status_code == 200
        again = await anonymous.post("/api/v1/auth/email/verify", json={"token": token})
        assert again.status_code == 400

    assert (await client.get("/api/v1/auth/profile")).json()["email_verified"] is True
    assert (await client.post("/api/v1/auth/email/resend")).status_code == 400


async def test_resend_verification_invalidates_previous_link(client, sent_emails):
    await signup(client)
    first = sent_emails[-1]["token"]
    assert (await client.post("/api/v1/auth/email/resend")).status_code == 200
    second = sent_emails[-1]["token"]

    assert (await client.post("/api/v1/auth/email/verify", json={"token": first})).status_code == 400
    assert (await client.post("/api/v1/auth/email/verify", json={"token": second})).status_code == 200


# ---------- password reset / change ----------

async def test_forgot_password_does_not_reveal_accounts(client, sent_emails):
    unknown = await client.post("/api/v1/auth/password/forgot", json={"email": "nobody@example.com"})
    assert unknown.status_code == 200
    assert not [e for e in sent_emails if e["kind"] == "reset"]


async def test_password_reset_flow_revokes_sessions(client, sent_emails):
    await signup(client)
    await client.post("/api/v1/auth/password/forgot", json={"email": "creator@example.com"})
    token = [e for e in sent_emails if e["kind"] == "reset"][-1]["token"]

    weak = await client.post("/api/v1/auth/password/reset", json={"token": token, "password": "weak"})
    assert weak.status_code == 400

    ok = await client.post("/api/v1/auth/password/reset", json={"token": token, "password": NEW_PASSWORD})
    assert ok.status_code == 200
    reused = await client.post("/api/v1/auth/password/reset", json={"token": token, "password": NEW_PASSWORD})
    assert reused.status_code == 400

    # Existing session can no longer refresh; the new password works; reset also verifies the email.
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401
    async with make_client() as fresh:
        login = await fresh.post("/api/v1/auth/login", json={"email": "creator@example.com", "password": NEW_PASSWORD})
        assert login.status_code == 200 and login.json()["email_verified"] is True


async def test_expired_reset_token_is_rejected(client, sent_emails):
    from app.model.user_token import UserToken

    await signup(client)
    await client.post("/api/v1/auth/password/forgot", json={"email": "creator@example.com"})
    token = [e for e in sent_emails if e["kind"] == "reset"][-1]["token"]
    with Session(sync_engine) as db:
        for row in db.exec(select(UserToken)).all():
            row.expires_at = utc_now() - timedelta(minutes=1)
            db.add(row)
        db.commit()
    response = await client.post("/api/v1/auth/password/reset", json={"token": token, "password": NEW_PASSWORD})
    assert response.status_code == 400


async def test_change_password_signs_out_other_devices(client, sent_emails):
    await signup(client)
    async with make_client() as other:
        await other.post("/api/v1/auth/login", json={"email": "creator@example.com", "password": PASSWORD})

        wrong = await client.post(
            "/api/v1/auth/password/change",
            json={"current_password": "Nope1!xx", "new_password": NEW_PASSWORD},
        )
        assert wrong.status_code == 400

        ok = await client.post(
            "/api/v1/auth/password/change",
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        )
        assert ok.status_code == 200
        assert (await client.post("/api/v1/auth/refresh")).status_code == 200
        assert (await other.post("/api/v1/auth/refresh")).status_code == 401


async def test_delete_account_requires_password(client, sent_emails):
    await signup(client)
    wrong = await client.request("DELETE", "/api/v1/auth/account", json={"password": "Nope1!xx"})
    assert wrong.status_code == 400
    ok = await client.request("DELETE", "/api/v1/auth/account", json={"password": PASSWORD})
    assert ok.status_code == 200
    with Session(sync_engine) as db:
        assert db.exec(select(User)).first() is None
        assert db.exec(select(AuthSession)).first() is None


# ---------- CSRF ----------

async def test_cross_site_post_is_blocked(client, sent_emails):
    await signup(client)
    evil = await client.post("/api/v1/auth/logout", headers={"Origin": "https://evil.example"})
    assert evil.status_code == 403
    allowed = await client.post("/api/v1/auth/logout", headers={"Origin": "http://localhost:3000"})
    assert allowed.status_code == 200


# ---------- OAuth callback ----------

async def test_oauth_callback_errors_redirect_back_to_app(client):
    denied = await client.get("/api/v1/instagram/oauth/callback?error=access_denied")
    assert denied.status_code == 302
    assert denied.headers["location"].endswith("/onboarding?connected=false&error=access_denied")

    stale = await client.get(f"/api/v1/instagram/oauth/callback?code=abc&state={uuid4().hex}")
    assert stale.headers["location"].endswith("error=invalid_state")


# ---------- jobs ----------

def _insert_job(user_id, **fields):
    with Session(sync_engine) as db:
        job = AnalysisJob(user_id=user_id, job_type="report_generation", status="running", progress=40, **fields)
        db.add(job)
        db.commit()
        db.refresh(job)
        return job.id


async def test_running_job_with_recent_heartbeat_is_not_failed(client, sent_emails):
    await signup(client)
    now = utc_now()
    job_id = _insert_job(
        _user_id(),
        created_at=now - timedelta(minutes=40),
        started_at=now - timedelta(minutes=40),
        updated_at=now - timedelta(seconds=20),
    )
    response = await client.get(f"/api/v1/analysis/jobs/{job_id}")
    assert response.status_code == 200 and response.json()["status"] == "running"


async def test_running_job_without_heartbeat_is_failed(client, sent_emails):
    await signup(client)
    old = utc_now() - timedelta(minutes=40)
    job_id = _insert_job(_user_id(), created_at=old, started_at=old, updated_at=old)
    response = await client.get(f"/api/v1/analysis/jobs/{job_id}")
    assert response.json()["status"] == "failed"
    assert "interrupted" in response.json()["error_message"]


async def test_other_users_job_is_forbidden(client, sent_emails):
    await signup(client)
    job_id = _insert_job(_user_id(), updated_at=utc_now())
    async with make_client() as other:
        await signup(other, email="other@example.com")
        assert (await other.get(f"/api/v1/analysis/jobs/{job_id}")).status_code == 403


# ---------- dashboard ----------

async def test_dashboard_videos_paginate_with_total(client, sent_emails):
    await signup(client)
    user_id = _user_id()
    now = utc_now()
    with Session(sync_engine) as db:
        for index in range(5):
            item = MediaItem(
                user_id=user_id,
                external_media_id=f"m{index}",
                media_type="VIDEO",
                caption=f"Reel {index}",
                permalink="",
                thumbnail_url="",
                published_at=now - timedelta(days=index),
            )
            db.add(item)
            db.commit()
            db.refresh(item)
            db.add(
                MediaMetric(
                    media_item_id=item.id,
                    view=100 * (index + 1),
                    reach=50,
                    likes=1,
                    comments="0",
                    saves=0,
                    shares=0,
                    total_interactions=5,
                    captured_at=now,
                )
            )
        db.commit()

    page = (await client.get("/api/v1/analysis/dashboard/videos?limit=2&offset=2")).json()
    assert page["total"] == 5
    assert [v["caption"] for v in page["data"]] == ["Reel 2", "Reel 3"]
    assert page["data"][0]["views"] == 300 and page["data"][0]["engagement_rate"] == 10.0

    stats = (await client.get("/api/v1/analysis/dashboard/stats")).json()
    assert stats["total_views"] == 1500


@pytest.mark.parametrize("path", ["/api/v1/analysis/dashboard/stats", "/api/v1/reports/", "/api/v1/competitors/"])
async def test_protected_routes_require_auth(client, path):
    assert (await client.get(path)).status_code == 401


# ---------- scheduler + reconnect ----------

def _connect_instagram(user_id, *, last_synced_days_ago, token_expires_in_days):
    from app.model.external_token import ExternalToken
    from app.model.instagram_accounts import InstagramAccount
    from app.service.instagram_service import fernet

    with Session(sync_engine) as db:
        db.add(
            InstagramAccount(
                user_id=user_id,
                instagram_user_id="ig1",
                username="creator",
                account_type="CREATOR",
                followers_count=10,
                media_count=3,
                last_synced_at=utc_now() - timedelta(days=last_synced_days_ago),
            )
        )
        db.add(
            ExternalToken(
                user_id=user_id,
                encrypted_access_token=fernet.encrypt(b"token").decode(),
                expires_at=utc_now() + timedelta(days=token_expires_in_days),
                scopes=["instagram_business_basic"],
            )
        )
        db.commit()


async def test_daily_sync_scheduler_queues_due_accounts_once(client, sent_emails, monkeypatch):
    from app.service import instagram_service, scheduled_service

    dispatched = []
    monkeypatch.setattr(instagram_service, "_dispatch_sync_celery", lambda job_id, user_id: dispatched.append(job_id))
    await signup(client)
    _connect_instagram(_user_id(), last_synced_days_ago=2, token_expires_in_days=30)

    assert scheduled_service.enqueue_due_syncs_task() == 1
    # A sync is already queued, so the next run must not add another.
    assert scheduled_service.enqueue_due_syncs_task() == 0
    assert len(dispatched) == 1


async def test_expired_token_flags_reconnect_and_is_not_auto_synced(client, sent_emails, monkeypatch):
    from app.service import instagram_service, scheduled_service

    monkeypatch.setattr(instagram_service, "_dispatch_sync_celery", lambda *a: None)
    await signup(client)
    _connect_instagram(_user_id(), last_synced_days_ago=2, token_expires_in_days=-1)

    accounts = (await client.get("/api/v1/instagram/accounts")).json()
    assert accounts[0]["needs_reconnect"] is True and accounts[0]["username"] == "creator"
    assert scheduled_service.enqueue_due_syncs_task() == 0
