from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

from app.core.logger import logger

ALLOWED_CDN_HOST_SUFFIXES = ("cdninstagram.com", "fbcdn.net")
# Demo seed script uses placeholder images (not Instagram CDN).
ALLOWED_DEMO_HOST_SUFFIXES = ("placehold.co",)


def is_allowed_cdn_image_url(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    if any(host.endswith(suffix) for suffix in ALLOWED_DEMO_HOST_SUFFIXES):
        return True
    return any(host.endswith(suffix) for suffix in ALLOWED_CDN_HOST_SUFFIXES)


async def fetch_cdn_image(url: str) -> tuple[bytes, str]:
    if not is_allowed_cdn_image_url(url):
        raise HTTPException(status_code=400, detail="Invalid image URL")

    timeout = httpx.Timeout(15.0, connect=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; Reelysis/1.0)"},
            )
    except httpx.TimeoutException as e:
        logger.warning("CDN image fetch timed out: %s", url)
        raise HTTPException(status_code=504, detail="Image fetch timed out") from e
    except httpx.RequestError as e:
        logger.warning("CDN image fetch failed: %s — %s", url, e)
        raise HTTPException(status_code=502, detail="Failed to fetch image from provider") from e

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Failed to fetch image from provider")

    media_type = response.headers.get("content-type", "image/jpeg")
    return response.content, media_type
