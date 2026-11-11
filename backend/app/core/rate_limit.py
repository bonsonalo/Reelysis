"""HTTP rate limiting via slowapi (Redis-backed when REDIS_URL is set)."""

from __future__ import annotations

import jwt
from fastapi import Request
from jwt import PyJWTError
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def _client_ip(request: Request) -> str:
    """
    Each trusted proxy appends the address it received the request from, so the client IP is the
    entry TRUSTED_PROXY_HOPS from the right. Entries further left are client-controlled.
    """
    hops = settings.TRUSTED_PROXY_HOPS
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded and hops > 0:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[-hops] if len(parts) >= hops else parts[0]
    if request.client and request.client.host:
        return request.client.host
    return get_remote_address(request)


def get_ip_key(request: Request) -> str:
    return f"ip:{_client_ip(request)}"


def get_user_key(request: Request) -> str:
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            user_id = payload.get("id")
            if user_id:
                return f"user:{user_id}"
        except PyJWTError:
            pass
    return f"ip:{_client_ip(request)}"


def _storage_uri() -> str:
    if settings.RATE_LIMIT_STORAGE == "memory":
        return "memory://"
    return settings.REDIS_URL


limiter = Limiter(
    key_func=get_ip_key,
    storage_uri=_storage_uri(),
    enabled=settings.RATE_LIMIT_ENABLED,
    headers_enabled=False,
)


def auth_signup_limit() -> str:
    return f"{settings.RATE_LIMIT_AUTH_SIGNUP_PER_HOUR}/hour"


def auth_login_limit() -> str:
    return f"{settings.RATE_LIMIT_AUTH_LOGIN_PER_MINUTE}/minute"


def auth_refresh_limit() -> str:
    return f"{settings.RATE_LIMIT_AUTH_REFRESH_PER_MINUTE}/minute"


def job_trigger_limit() -> str:
    return f"{settings.RATE_LIMIT_JOB_TRIGGERS_PER_HOUR}/hour"


def ai_trigger_limit() -> str:
    return f"{settings.RATE_LIMIT_AI_TRIGGERS_PER_HOUR}/hour"


def auth_email_limit() -> str:
    return f"{settings.RATE_LIMIT_AUTH_EMAIL_PER_HOUR}/hour"
