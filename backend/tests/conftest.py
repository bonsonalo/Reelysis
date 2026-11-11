"""
Test setup. Integration tests need Postgres + Redis; defaults match:

    docker run -d --name reelysis-test-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=reelysis_test -p 5433:5432 postgres:16
    docker run -d --name reelysis-test-redis -p 6380:6379 redis:7

Override with TEST_DB_URL / TEST_REDIS_URL.
"""

import os

from cryptography.fernet import Fernet

os.environ.update(
    {
        "APP_ENV": "test",
        "DB_URL": os.getenv("TEST_DB_URL", "postgresql://postgres:postgres@localhost:5433/reelysis_test"),
        "REDIS_URL": os.getenv("TEST_REDIS_URL", "redis://localhost:6380/0"),
        "SECRET_KEY": "test-secret-key-that-is-at-least-32-bytes",
        "ALGORITHM": "HS256",
        "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
        "IG_APP_ID": "test-app",
        "IG_APP_SECRET": "test-secret",
        "IG_REDIRECT_URI": "http://testserver/api/v1/instagram/oauth/callback",
        "TOKEN_ENCRYPTION_KEY": Fernet.generate_key().decode(),
        "GEMINI_API_KEY": "test",
        "AI_SIMULATION_MODE": "true",
        "RATE_LIMIT_ENABLED": "false",
        "RATE_LIMIT_STORAGE": "memory",
        "RUN_MIGRATIONS_ON_STARTUP": "false",
        "FRONTEND_URL": "http://localhost:3000",
        "SMTP_HOST": "",
    }
)

import httpx  # noqa: E402
import pytest  # noqa: E402
from sqlalchemy import text  # noqa: E402

TABLES = (
    "recommendations, account_reports, video_analysis, media_metrics, media_items, competitior_media, "
    "competitor_accounts, analysis_jobs, external_tokens, instagram_accounts, auth_sessions, user_tokens, users"
)


def _db_available() -> bool:
    try:
        from app.core.database import sync_engine

        with sync_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def migrated_db():
    if not _db_available():
        pytest.skip("Postgres test database not available")
    from app.core.migrations import run_migrations

    run_migrations()
    yield


@pytest.fixture
def clean_db(migrated_db):
    from app.core.database import sync_engine

    with sync_engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {TABLES} CASCADE"))
    yield


@pytest.fixture
def sent_emails(monkeypatch):
    """Capture tokens from outgoing emails instead of sending them."""
    from app.service import auth_service

    sent: list[dict] = []
    monkeypatch.setattr(
        auth_service,
        "send_verification_email",
        lambda to, name, token: sent.append({"kind": "verify", "to": to, "token": token}) or True,
    )
    monkeypatch.setattr(
        auth_service,
        "send_password_reset_email",
        lambda to, name, token: sent.append({"kind": "reset", "to": to, "token": token}) or True,
    )
    return sent


def make_client() -> httpx.AsyncClient:
    from app.main import app

    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")


@pytest.fixture
async def client(clean_db):
    async with make_client() as c:
        yield c
