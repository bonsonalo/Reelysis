from urllib.parse import urlparse
from uuid import UUID

import httpx
import redis.asyncio as redis
from fastapi import HTTPException

from app.core.config import settings
from app.core.logger import logger

ALLOWED_CDN_HOST_SUFFIXES = ("cdninstagram.com", "fbcdn.net")
# Demo seed script uses placeholder images (not Instagram CDN).
ALLOWED_DEMO_HOST_SUFFIXES = ("placehold.co",)

# At most one paid profile refresh per competitor per window when its picture link has expired.
AVATAR_REFRESH_INTERVAL_SECONDS = 24 * 3600
INSTAGRAM_CDN_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.instagram.com/",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "cross-site",
}

_redis_binary: redis.Redis | None = None


def competitor_avatar_cache_key(competitor_id: UUID) -> str:
    return f"avatar:competitor:{competitor_id}"


def _redis_binary_client() -> redis.Redis:
    global _redis_binary
    if _redis_binary is None:
        _redis_binary = redis.from_url(settings.REDIS_URL, decode_responses=False)
    return _redis_binary


def is_allowed_cdn_image_url(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    if any(host.endswith(suffix) for suffix in ALLOWED_DEMO_HOST_SUFFIXES):
        return True
    return any(host.endswith(suffix) for suffix in ALLOWED_CDN_HOST_SUFFIXES)


async def get_cached_avatar(cache_key: str) -> tuple[bytes, str] | None:
    try:
        client = _redis_binary_client()
        content = await client.get(f"{cache_key}:bytes")
        if not content:
            return None
        media_type_raw = await client.get(f"{cache_key}:type")
        media_type = (
            media_type_raw.decode("utf-8")
            if isinstance(media_type_raw, bytes)
            else (media_type_raw or "image/jpeg")
        )
        return content, media_type
    except Exception as e:
        logger.warning("Avatar cache read failed for %s: %s", cache_key, e)
        return None


async def set_cached_avatar(cache_key: str, content: bytes, media_type: str) -> None:
    # No expiry: the signed CDN link it came from dies within days, so this copy may be the only
    # one left. A profile refresh overwrites it with the new picture.
    try:
        client = _redis_binary_client()
        pipe = client.pipeline()
        pipe.set(f"{cache_key}:bytes", content)
        pipe.set(f"{cache_key}:type", media_type.encode("utf-8"))
        await pipe.execute()
    except Exception as e:
        logger.warning("Avatar cache write failed for %s: %s", cache_key, e)


async def claim_avatar_refresh(competitor_id: UUID) -> bool:
    """True for the first caller per competitor per window; refreshes cost a paid profile lookup."""
    try:
        claimed = await _redis_binary_client().set(
            f"avatar:refresh:{competitor_id}",
            b"1",
            nx=True,
            ex=AVATAR_REFRESH_INTERVAL_SECONDS,
        )
        return bool(claimed)
    except Exception as e:
        # Without the lock every page view could trigger a paid lookup, so skip the refresh.
        logger.warning("Avatar refresh claim failed for %s: %s", competitor_id, e)
        return False


async def fetch_cdn_image(url: str) -> tuple[bytes, str]:
    if not is_allowed_cdn_image_url(url):
        raise HTTPException(status_code=400, detail="Invalid image URL")

    timeout = httpx.Timeout(15.0, connect=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers=INSTAGRAM_CDN_HEADERS)
    except httpx.TimeoutException as e:
        logger.warning("CDN image fetch timed out: %s", url)
        raise HTTPException(status_code=504, detail="Image fetch timed out") from e
    except httpx.RequestError as e:
        logger.warning("CDN image fetch failed: %s — %s", url, e)
        raise HTTPException(status_code=502, detail="Failed to fetch image from provider") from e

    if response.status_code >= 400:
        logger.warning(
            "CDN image fetch returned %s for host %s",
            response.status_code,
            urlparse(url).netloc,
        )
        raise HTTPException(status_code=502, detail="Failed to fetch image from provider")

    media_type = response.headers.get("content-type", "image/jpeg")
    return response.content, media_type


async def cache_cdn_image(cache_key: str, url: str) -> bool:
    """Fetch a CDN image while the URL is fresh and store it in Redis."""
    if not url:
        return False
    content, media_type = await fetch_cdn_image(url)
    await set_cached_avatar(cache_key, content, media_type)
    return True


async def prefetch_competitor_avatar(competitor_id: UUID, url: str | None) -> None:
    if not url:
        return
    try:
        await cache_cdn_image(competitor_avatar_cache_key(competitor_id), url)
    except HTTPException as e:
        logger.warning(
            "Competitor avatar prefetch failed for %s (status %s)",
            competitor_id,
            e.status_code,
        )
    except Exception as e:
        logger.warning("Competitor avatar prefetch failed for %s: %s", competitor_id, e)
