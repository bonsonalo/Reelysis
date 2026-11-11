"""Normalize Supabase Postgres URLs for SQLAlchemy (asyncpg + psycopg)."""

from __future__ import annotations

import ssl
from uuid import uuid4

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


def is_supabase_pooler_host(db_url: str) -> bool:
    url = make_url(normalize_async_db_url(db_url))
    return "pooler" in (url.host or "").lower()


def uses_supabase_transaction_pooler(db_url: str) -> bool:
    """PgBouncer transaction mode (port 6543) needs NullPool and no prepared statements."""
    url = make_url(normalize_async_db_url(db_url))
    if url.port == 6543:
        return True
    host = (url.host or "").lower()
    return "pooler" in host and url.port not in (None, 5432)


def requires_pgbouncer_compat(db_url: str) -> bool:
    """
    Disable asyncpg/SQLAlchemy prepared statements for Supabase pooler URLs.
    Required for transaction pooler (6543); safe for session pooler (5432) too.
    """
    return uses_supabase_transaction_pooler(db_url) or is_supabase_pooler_host(db_url)


def asyncpg_pgbouncer_connect_args() -> dict:
    return {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        # asyncpg numbers statements per connection; pooled client connections share server
        # connections behind PgBouncer, so numbered names can collide.
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
    }


def asyncpg_ssl_connect_arg(sslmode: str | None, *, ssl_required: bool = False) -> ssl.SSLContext | None:
    if sslmode:
        if sslmode.lower() in ("disable", "allow"):
            return None
        mode = sslmode.lower()
        if mode == "require":
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            return ctx
        return ssl.create_default_context()
    if ssl_required:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
    return None


def _parse_ssl_query_params(query: dict) -> tuple[dict, str | None, bool]:
    """
    Strip ssl/sslmode from URL query (asyncpg rejects them as connect kwargs).
    Returns (remaining_query, sslmode, ssl_required).
    """
    remaining = dict(query)
    sslmode = remaining.pop("sslmode", None)
    ssl_val = remaining.pop("ssl", None)

    ssl_required = False
    if sslmode:
        ssl_required = sslmode.lower() not in ("disable", "allow")
    elif ssl_val is not None:
        token = str(ssl_val).strip().lower()
        if token in ("true", "1", "yes", "require", "on"):
            ssl_required = True
        elif token in ("false", "0", "no", "disable", "off"):
            ssl_required = False
        else:
            # e.g. ssl=verify-full — treat as required with explicit mode when possible
            sslmode = token
            ssl_required = token not in ("disable", "allow")

    return remaining, sslmode, ssl_required


def build_async_engine_url_and_connect_args(db_url: str) -> tuple[str, dict, bool]:
    """asyncpg rejects ssl/sslmode in the URL query; map them to connect_args instead."""
    normalized = normalize_async_db_url(db_url)
    url = make_url(normalized)
    query = dict(url.query)
    cleaned_query, sslmode, ssl_required = _parse_ssl_query_params(query)
    via_pooler = uses_supabase_transaction_pooler(normalized)
    pgbouncer_compat = requires_pgbouncer_compat(normalized)
    connect_args: dict = {}
    if pgbouncer_compat:
        connect_args.update(asyncpg_pgbouncer_connect_args())
    ssl_ctx = asyncpg_ssl_connect_arg(sslmode, ssl_required=ssl_required)
    if ssl_ctx is not None:
        connect_args["ssl"] = ssl_ctx
    if cleaned_query != query or sslmode is not None or ssl_required:
        url = url.set(query=cleaned_query)
    return url.render_as_string(hide_password=False), connect_args, via_pooler


def build_sync_engine_url_and_connect_args(db_url: str) -> tuple[str, dict]:
    """psycopg accepts sslmode in the URL; convert Supabase ?ssl=true to sslmode=require."""
    normalized = normalize_sync_db_url(db_url)
    url = make_url(normalized)
    query = dict(url.query)
    cleaned_query, sslmode, ssl_required = _parse_ssl_query_params(query)
    if ssl_required and not sslmode:
        cleaned_query = {**cleaned_query, "sslmode": "require"}
    elif sslmode and "sslmode" not in cleaned_query:
        cleaned_query = {**cleaned_query, "sslmode": sslmode}
    if cleaned_query != query:
        url = url.set(query=cleaned_query)
    connect_args: dict = {}
    if requires_pgbouncer_compat(db_url):
        connect_args["prepare_threshold"] = None
    return url.render_as_string(hide_password=False), connect_args


def describe_db_target(db_url: str) -> str:
    """Safe one-line summary for logs (no password)."""
    try:
        async_url, _, via_pooler = build_async_engine_url_and_connect_args(db_url)
        url = make_url(async_url)
        host = url.host or "(missing host)"
        port = url.port or 5432
        user = url.username or "(missing user)"
        mode = "transaction-pooler" if via_pooler else "session-pooler"
        if not is_supabase_pooler_host(db_url):
            mode = "direct"
        compat = "pgbouncer-compat" if requires_pgbouncer_compat(db_url) else "prepared-ok"
        return f"host={host} port={port} user={user} mode={mode} db={compat}"
    except Exception as exc:
        return f"invalid DB_URL ({exc})"

