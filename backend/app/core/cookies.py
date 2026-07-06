from fastapi import Response

from app.core.config import settings


def _cookie_params() -> dict:
    """HttpOnly auth cookies. Production uses Secure + SameSite=None for cross-origin Vercel → API."""
    if settings.is_production:
        return {
            "httponly": True,
            "secure": True,
            "samesite": "none",
        }
    return {
        "httponly": True,
        "secure": False,
        "samesite": "lax",
    }


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    params = _cookie_params()
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **params,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=30 * 24 * 60 * 60,
        **params,
    )


def clear_auth_cookies(response: Response) -> None:
    params = _cookie_params()
    response.delete_cookie(key="access_token", **params)
    response.delete_cookie(key="refresh_token", **params)
