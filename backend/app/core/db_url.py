"""Normalize Supabase Postgres URLs for SQLAlchemy (asyncpg + psycopg)."""

from __future__ import annotations

import ssl

from sqlalchemy.engine import make_url


def normalize_async_db_url(db_url: str) -> str:
    """Supabase URIs are often postgresql:// — async SQLAlchemy needs +asyncpg."""
    if db_url.startswith("postgresql://"):
        return db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if db_url.startswith("postgres://"):
        return db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    return db_url


def normalize_sync_db_url(db_url: str) -> str:
    """Celery / Alembic sync engine uses psycopg v3."""
    url = normalize_async_db_url(db_url)
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)
    if url.startswith("sqlite://") and not url.startswith("sqlite:///"):
        return url.replace("sqlite://", "sqlite:///", 1)
    return url


def uses_supabase_transaction_pooler(db_url: str) -> bool:
    """PgBouncer transaction mode (port 6543) needs NullPool and no prepared statements."""
    url = make_url(normalize_async_db_url(db_url))
    if url.port == 6543:
        return True
    host = (url.host or "").lower()
    return "pooler" in host and url.port != 5432


def asyncpg_ssl_connect_arg(sslmode: str | None) -> ssl.SSLContext | None:
    if not sslmode or sslmode.lower() in ("disable", "allow"):
        return None
    mode = sslmode.lower()
    if mode == "require":
        # Supabase: TLS required; chain may not verify on all PaaS hosts.
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
    return ssl.create_default_context()


def build_async_engine_url_and_connect_args(db_url: str) -> tuple[str, dict, bool]:
    """asyncpg rejects sslmode in the URL query; map it to connect_args instead."""
    normalized = normalize_async_db_url(db_url)
    url = make_url(normalized)
    query = dict(url.query)
    sslmode = query.pop("sslmode", None)
    via_pooler = uses_supabase_transaction_pooler(normalized)
    connect_args: dict = {}
    if via_pooler:
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_cache_size"] = 0
    ssl_ctx = asyncpg_ssl_connect_arg(sslmode)
    if ssl_ctx is not None:
        connect_args["ssl"] = ssl_ctx
    if sslmode is not None:
        url = url.set(query=query)
    return url.render_as_string(hide_password=False), connect_args, via_pooler
