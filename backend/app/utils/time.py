from datetime import datetime, timezone


def utc_now() -> datetime:
    """Naive UTC for PostgreSQL TIMESTAMP WITHOUT TIME ZONE (asyncpg-safe)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def utc_epoch() -> datetime:
    return datetime.fromtimestamp(0, tz=timezone.utc).replace(tzinfo=None)
