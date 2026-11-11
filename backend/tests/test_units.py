"""Fast tests for pure helpers (no database needed)."""

from datetime import timedelta
from types import SimpleNamespace

import jwt
import pytest

from app.api.dep import decode_token
from app.core.client.social_data import _coerce_int, normalize_competitor_media
from app.core.config import settings
from app.core.db_url import (
    build_async_engine_url_and_connect_args,
    normalize_async_db_url,
    normalize_sync_db_url,
    requires_pgbouncer_compat,
)
from app.core.middleware import _origin_of
from app.core.rate_limit import _client_ip
from app.service.auth_service import hash_token
from app.service.instagram_service import _is_syncable, _parse_insight_metrics
from app.service.job_utils import STALE_RUNNING_SECONDS, last_heartbeat_age
from app.service.report_service import STRONG_HOOK_SCORE, WINNING_HOOK_SCORE
from app.service.dashboard_service import _format_percent_change
from app.utils.instagram_handle import normalize_handle
from app.utils.password_strength import validate_password_strength
from app.utils.scoring import normalize_score_0_100
from app.utils.time import utc_epoch, utc_now


def _token(**claims):
    payload = {"sub": "a@b.com", "id": "6f1c1e3e-2a43-4bde-9a8f-0f4b8a3e1c11", "token_type": "access"}
    payload.update(claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def test_decode_token_rejects_expired_with_value_error():
    # Regression: PyJWT errors used to escape as 500s because python-jose's JWTError was caught.
    expired = _token(exp=utc_now() - timedelta(minutes=1))
    with pytest.raises(ValueError):
        decode_token(expired, "access")


def test_decode_token_rejects_wrong_type_and_garbage():
    with pytest.raises(ValueError):
        decode_token(_token(token_type="refresh"), "access")
    with pytest.raises(ValueError):
        decode_token("not-a-jwt", "access")
    with pytest.raises(ValueError):
        decode_token(_token(id="not-a-uuid"), "access")


def test_hash_token_distinguishes_tokens_sharing_a_long_prefix():
    # Regression: bcrypt only reads 72 bytes, so refresh JWTs for the same user all "matched".
    prefix = "x" * 100
    assert hash_token(prefix + "a") != hash_token(prefix + "b")


@pytest.mark.parametrize(
    "password,ok",
    [("Abc1!x", True), ("abc1!x", False), ("ABC1!X", False), ("Abcd!x", False), ("Abc1xx", False), ("Ab1!", False)],
)
def test_password_strength(password, ok):
    if ok:
        assert validate_password_strength(password) == password
    else:
        with pytest.raises(ValueError):
            validate_password_strength(password)


@pytest.mark.parametrize("raw,expected", [(None, 0), (7, 70), (10, 100), (85, 85), (150, 100), (-5, 0)])
def test_normalize_score(raw, expected):
    assert normalize_score_0_100(raw) == expected


def test_db_url_normalisation():
    assert normalize_async_db_url("postgresql://u:p@h/db").startswith("postgresql+asyncpg://")
    assert normalize_sync_db_url("postgres://u:p@h/db").startswith("postgresql+psycopg://")
    url, args, via_pooler = build_async_engine_url_and_connect_args(
        "postgresql://u:p@aws-0-x.pooler.supabase.com:6543/db?sslmode=require"
    )
    assert "sslmode" not in url and via_pooler
    assert args["statement_cache_size"] == 0 and "ssl" in args
    assert requires_pgbouncer_compat("postgresql://u:p@aws-0-x.pooler.supabase.com:5432/db")


def test_client_ip_uses_trusted_hop_not_spoofable_first_entry(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXY_HOPS", 1)
    request = SimpleNamespace(
        headers={"X-Forwarded-For": "6.6.6.6, 203.0.113.9"},
        client=SimpleNamespace(host="10.0.0.1"),
    )
    assert _client_ip(request) == "203.0.113.9"
    monkeypatch.setattr(settings, "TRUSTED_PROXY_HOPS", 0)
    assert _client_ip(request) == "10.0.0.1"


def test_origin_parsing():
    assert _origin_of("https://App.example.com/path?x=1") == "https://app.example.com"
    assert _origin_of("null") == ""


def test_only_videos_are_synced():
    assert _is_syncable({"media_type": "VIDEO", "media_product_type": "REELS"})
    assert _is_syncable({"media_type": "VIDEO"})
    assert not _is_syncable({"media_type": "IMAGE", "media_product_type": "FEED"})
    assert not _is_syncable({"media_type": "CAROUSEL_ALBUM"})


def test_insight_metric_shapes():
    parsed = _parse_insight_metrics(
        {"data": [{"name": "views", "total_value": {"value": 12}}, {"name": "reach", "values": [{"value": 9}]}]}
    )
    assert parsed == {"views": 12, "reach": 9}


def test_competitor_media_normalisation_parses_counts_and_dates():
    rows = normalize_competitor_media(
        [{"shortcode": "abc", "views": "1.2k", "likes": "35", "date_posted": "2026-03-01T10:00:00.000Z"}]
    )
    assert rows[0]["id"] == "abc"
    assert rows[0]["metrics"]["views"] == 1200
    assert rows[0]["published_at"].isoformat() == "2026-03-01T10:00:00"
    assert _coerce_int("2.5M") == 2_500_000


def test_heartbeat_age_uses_latest_activity():
    now = utc_now()
    job = SimpleNamespace(
        created_at=now - timedelta(hours=1),
        started_at=now - timedelta(minutes=50),
        updated_at=now - timedelta(seconds=30),
    )
    # Regression: jobs used to be failed by start time even while actively reporting progress.
    assert last_heartbeat_age(job, now) < STALE_RUNNING_SECONDS
    job.updated_at = utc_epoch()
    assert last_heartbeat_age(job, now) >= STALE_RUNNING_SECONDS


def test_report_hook_thresholds_use_0_100_scale():
    # Regression: thresholds were 8/7 on a 0-100 scale, so every competitor video was "winning".
    assert WINNING_HOOK_SCORE == 80 and STRONG_HOOK_SCORE == 70


@pytest.mark.parametrize(
    "raw, expected",
    [("@Gym_Daily", "gym_daily"), ("fit.coach", "fit.coach"), ("https://instagram.com/abc/?hl=en", "abc")],
)
def test_normalize_handle_accepts_handles_and_urls(raw, expected):
    assert normalize_handle(raw) == expected


@pytest.mark.parametrize("raw", ["", "@", "bad handle", "semi;colon", "a" * 31])
def test_normalize_handle_rejects_invalid(raw):
    with pytest.raises(ValueError):
        normalize_handle(raw)


def test_percent_change_without_baseline_is_new_not_100_percent():
    assert _format_percent_change(500, 0) == "New"
    assert _format_percent_change(0, 0) == "0%"
    assert _format_percent_change(150, 100) == "+50%"


@pytest.fixture
def wake_pings(monkeypatch):
    """Record worker wake pings synchronously instead of making HTTP calls."""
    from app.core import worker_wake

    pings: list[str] = []

    class InlineThread:
        def __init__(self, target, args=(), daemon=None):
            self._run = lambda: target(*args)

        def start(self):
            self._run()

    monkeypatch.setattr(worker_wake, "_ping", pings.append)
    monkeypatch.setattr(worker_wake.threading, "Thread", InlineThread)
    monkeypatch.setattr(worker_wake, "_last_ping", 0.0)
    monkeypatch.setattr(worker_wake, "_active_tasks", 0)
    monkeypatch.setattr(settings, "WORKER_WAKE_URL", "https://worker.example.com")
    return pings


def test_queueing_a_job_wakes_the_worker_at_most_once_per_interval(wake_pings, monkeypatch):
    from celery.signals import after_task_publish
    from app.core import worker_wake

    clock = [1000.0]
    monkeypatch.setattr(worker_wake.time, "monotonic", lambda: clock[0])

    after_task_publish.send(sender="some.task", headers={}, body=())
    after_task_publish.send(sender="some.task", headers={}, body=())
    assert wake_pings == ["https://worker.example.com"]

    clock[0] += worker_wake.PING_INTERVAL_SECONDS
    after_task_publish.send(sender="some.task", headers={}, body=())
    assert len(wake_pings) == 2


def test_worker_pings_itself_only_while_a_task_runs(wake_pings):
    from celery.signals import task_postrun, task_prerun
    from app.core import worker_wake

    assert worker_wake.keep_awake_tick() is False
    task_prerun.send(sender=None, task_id="t1", task=None)
    assert worker_wake.keep_awake_tick() is True
    task_postrun.send(sender=None, task_id="t1", task=None)
    worker_wake._last_ping = 0.0
    assert worker_wake.keep_awake_tick() is False
    assert wake_pings == ["https://worker.example.com"]


def test_worker_wake_is_off_without_a_url(wake_pings, monkeypatch):
    from app.core import worker_wake

    monkeypatch.setattr(settings, "WORKER_WAKE_URL", "")
    assert worker_wake.ping_worker() is False
    assert wake_pings == []
