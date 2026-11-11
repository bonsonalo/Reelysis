"""CSRF defence for cookie-authenticated, cross-site (SameSite=None) requests."""

from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _origin_of(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return ""
    return f"{parsed.scheme}://{parsed.netloc}".lower()


class OriginCheckMiddleware(BaseHTTPMiddleware):
    """
    Browsers always send Origin (or at least Referer) on cross-site state-changing requests, and a
    page cannot forge it. Rejecting unknown origins stops other sites from riding the auth cookies.
    Requests with neither header (curl, server-to-server) carry no browser cookies by accident, so
    they are allowed.
    """

    async def dispatch(self, request: Request, call_next):
        if request.method in UNSAFE_METHODS:
            source = request.headers.get("origin") or request.headers.get("referer")
            if source:
                allowed = {o.lower() for o in settings.cors_origin_list()}
                allowed.add(f"{request.url.scheme}://{request.url.netloc}".lower())
                if _origin_of(source) not in allowed:
                    return JSONResponse(status_code=403, content={"detail": "Origin not allowed"})
        return await call_next(request)
