from datetime import datetime, timezone

import httpx
from app.core.config import settings
from app.core.logger import logger

# Bright Data Instagram Scraper API dataset IDs (official docs)
PROFILE_DATASET_ID = "gd_l1vikfch901nx3by4"
POSTS_DATASET_ID = "gd_lk5ns7kz21pck8jpis"
REELS_DATASET_ID = "gd_lyclm20il4r5helnj"

# Known handles: scrape the profile URL directly (skip username discovery crawl).
PROFILE_COLLECT_BY_URL_PARAMS = "&discover_by=url"


def _coerce_int(value) -> int:
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return 0
    multiplier = 1
    lower = text.lower()
    if lower.endswith("k"):
        multiplier = 1_000
        text = text[:-1]
    elif lower.endswith("m"):
        multiplier = 1_000_000
        text = text[:-1]
    elif lower.endswith("b"):
        multiplier = 1_000_000_000
        text = text[:-1]
    try:
        return int(float(text) * multiplier)
    except ValueError:
        return 0


def _is_normalized_profile(entry: dict) -> bool:
    return bool(entry.get("handle")) and "followers_count" in entry and not entry.get("account")


def _is_profile_record(entry: dict) -> bool:
    if entry.get("description") or entry.get("video_url") or entry.get("caption"):
        return False
    return bool(
        entry.get("account")
        or entry.get("user_name")
        or entry.get("profile_url")
        or entry.get("profile_name")
    )


def normalize_competitor_profiles(raw_results: list) -> list[dict]:
    """
    Convert Bright Data profile or post records into a consistent competitor shape.
    """
    if not raw_results:
        return []

    if _is_normalized_profile(raw_results[0]):
        return raw_results

    normalized: list[dict] = []

    # Profile records (discover by username)
    if any(_is_profile_record(item) for item in raw_results):
        for entry in raw_results:
            handle = (
                entry.get("account")
                or entry.get("user_name")
                or entry.get("profile_name")
                or entry.get("handle")
                or ""
            ).strip().lstrip("@")
            if not handle and entry.get("profile_url"):
                url = str(entry.get("profile_url", "")).rstrip("/")
                handle = url.split("/")[-1] if url else ""
            if not handle:
                continue
            normalized.append(
                {
                    "handle": handle,
                    "display_name": (
                        entry.get("full_name")
                        or entry.get("display_name")
                        or entry.get("profile_name")
                        or handle
                    ),
                    "profile_picture_url": (
                        entry.get("profile_image_link")
                        or entry.get("profile_picture_url")
                        or entry.get("profile_pic_url")
                    ),
                    "followers_count": _coerce_int(
                        entry.get("followers")
                        or entry.get("followers_count")
                        or entry.get("follower_count")
                        or entry.get("subscribers")
                    ),
                    "media_count": _coerce_int(
                        entry.get("posts_count")
                        or entry.get("media_count")
                        or entry.get("post_count")
                    ),
                    "engagement_rate": float(
                        entry.get("avg_engagement") or entry.get("engagement_rate") or 0
                    ),
                }
            )
        return normalized

    # Post / reel records — aggregate by creator
    by_handle: dict[str, dict] = {}
    for entry in raw_results:
        handle = (
            entry.get("user_posted")
            or entry.get("username")
            or entry.get("account")
            or entry.get("handle")
            or ""
        ).strip().lstrip("@")
        if not handle:
            continue

        likes = _coerce_int(entry.get("likes") or entry.get("like_count"))
        comments = _coerce_int(entry.get("num_comments") or entry.get("comment_count"))
        views = _coerce_int(entry.get("views") or entry.get("view_count"))
        engagement_score = likes + comments + views

        existing = by_handle.get(handle)
        if not existing or engagement_score > existing["_engagement_score"]:
            by_handle[handle] = {
                "handle": handle,
                "display_name": entry.get("full_name") or entry.get("display_name") or handle,
                "profile_picture_url": (
                    entry.get("profile_image_link")
                    or entry.get("profile_picture_url")
                    or entry.get("thumbnail_url")
                ),
                "followers_count": _coerce_int(
                    entry.get("followers")
                    or entry.get("followers_count")
                    or entry.get("follower_count")
                ),
                "media_count": _coerce_int(entry.get("posts_count") or entry.get("media_count")),
                "engagement_rate": float(entry.get("avg_engagement") or entry.get("engagement_rate") or 0),
                "_engagement_score": engagement_score,
            }
        elif existing:
            existing["media_count"] = int(existing.get("media_count", 0)) + 1
            followers = _coerce_int(
                entry.get("followers")
                or entry.get("followers_count")
                or entry.get("follower_count")
            )
            if followers > int(existing.get("followers_count", 0)):
                existing["followers_count"] = followers

    ranked = sorted(by_handle.values(), key=lambda item: item["_engagement_score"], reverse=True)
    for item in ranked:
        item.pop("_engagement_score", None)
    return ranked


def _parse_posted_at(entry: dict) -> datetime | None:
    """Bright Data uses ISO strings (date_posted / timestamp) or unix seconds (taken_at). Returns naive UTC."""
    for key in ("date_posted", "timestamp", "taken_at", "posted_at"):
        value = entry.get(key)
        if not value:
            continue
        try:
            if isinstance(value, (int, float)):
                parsed = datetime.fromtimestamp(float(value), tz=timezone.utc)
            else:
                parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc).replace(tzinfo=None)
        except (ValueError, OSError, OverflowError):
            continue
    return None


def normalize_competitor_media(raw_results: list) -> list[dict]:
    """Map Bright Data reel/post records into competitor media rows."""
    normalized = []
    for entry in raw_results[:10]:
        caption = entry.get("caption") or entry.get("description") or ""
        hashtags = entry.get("hashtags") or []
        if isinstance(hashtags, str):
            hashtags = [tag.strip("#") for tag in hashtags.split() if tag.startswith("#")]

        metrics = {
            "views": _coerce_int(
                entry.get("views") or entry.get("view_count") or entry.get("video_view_count") or entry.get("video_play_count")
            ),
            "likes": _coerce_int(entry.get("likes") or entry.get("like_count")),
            "comments": _coerce_int(entry.get("num_comments") or entry.get("comment_count")),
        }

        normalized.append(
            {
                "id": entry.get("id") or entry.get("shortcode") or entry.get("post_id"),
                "caption": caption,
                "media_type": entry.get("content_type") or entry.get("media_type") or "VIDEO",
                "permalink": entry.get("url") or entry.get("post_url") or entry.get("permalink") or "",
                "thumbnail_url": entry.get("thumbnail_url") or entry.get("image_url") or "",
                "audio_url": entry.get("video_url") or entry.get("media_url") or entry.get("audio_url") or "",
                "hashtags": hashtags if isinstance(hashtags, list) else [],
                "transcript_text": entry.get("transcript_text") or entry.get("transcript") or "",
                "metrics": metrics,
                "published_at": _parse_posted_at(entry),
            }
        )
    return normalized


def instagram_profile_url(handle: str) -> str:
    clean = handle.strip().lstrip("@")
    return f"https://www.instagram.com/{clean}/"


class SocialDataClient:
    def __init__(self):
        self.api_key = settings.BRIGHT_DATA_API_KEY
        self.base_url = "https://api.brightdata.com/datasets/v3"

    def _profile_urls_payload(self, handles: list[str]) -> list[dict]:
        return [{"url": instagram_profile_url(handle)} for handle in handles]

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def _trigger(self, dataset_id: str, payload: list, extra_params: str = "") -> str | None:
        url = f"{self.base_url}/trigger?dataset_id={dataset_id}&format=json{extra_params}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=self._headers(), json=payload)
            if response.status_code >= 400:
                logger.error(
                    "Bright Data trigger failed (%s): %s",
                    response.status_code,
                    response.text,
                )
                response.raise_for_status()
            snapshot_id = response.json().get("snapshot_id")
            logger.info("Bright Data job triggered. snapshot_id=%s dataset=%s", snapshot_id, dataset_id)
            return snapshot_id

    async def fetch_profiles_for_handles(
        self,
        handles: list[str],
    ) -> tuple[str | None, str | None]:
        """Bright Data profile scrape for a known handle list (no Gemini)."""
        if settings.AI_SIMULATION_MODE or not self.api_key:
            return ("mock_snapshot_id_123", None)

        clean_handles = [
            h.strip().lstrip("@")
            for h in handles
            if h and h.strip().lstrip("@")
        ]
        if not clean_handles:
            return (None, "No handles provided for profile resync.")

        payload = self._profile_urls_payload(clean_handles)
        try:
            snapshot_id = await self._trigger(
                PROFILE_DATASET_ID,
                payload,
                extra_params=PROFILE_COLLECT_BY_URL_PARAMS,
            )
            return (snapshot_id, None)
        except Exception as e:
            logger.error("Error triggering Bright Data profile batch: %s", e)
            return (None, "Failed to refresh competitor profiles with Bright Data.")

    async def search_creators_by_niche(
        self,
        niche: str,
        exclude_handle: str | None = None,
        max_handles: int = 10,
        fallback_handles: list[str] | None = None,
        account_context: dict | None = None,
        force_refresh: bool = False,
    ) -> tuple[str | None, str | None, list[str]]:
        """
        Discover creators by asking Gemini for handles, then enriching profiles via Bright Data.
        Returns (snapshot_id, error_message, handles_sent_to_provider).
        """
        if settings.AI_SIMULATION_MODE or not self.api_key:
            logger.info(f"Simulation Mode: Mocking creator search for niche: {niche}")
            return ("mock_snapshot_id_123", None, ["fitness_expert_pro", "gym_daily_tips"])

        from app.service.ai_service import suggest_competitor_handles_sync

        handles, gemini_error = suggest_competitor_handles_sync(
            niche,
            exclude_handle=exclude_handle,
            max_handles=max_handles,
            account_context=account_context,
            force_refresh=force_refresh,
        )
        if not handles and fallback_handles:
            handles = [
                h.strip().lstrip("@")
                for h in fallback_handles
                if h and h.strip().lstrip("@").lower() != (exclude_handle or "").lower()
            ][:max_handles]
            if handles:
                logger.info(
                    "Gemini unavailable; refreshing %d existing competitor handle(s) via Bright Data",
                    len(handles),
                )

        if not handles:
            logger.error("No competitor handles for niche: %s", niche)
            return (None, gemini_error or "No competitor handles available for this niche.", [])

        payload = self._profile_urls_payload(handles)

        try:
            snapshot_id = await self._trigger(
                PROFILE_DATASET_ID,
                payload,
                extra_params=PROFILE_COLLECT_BY_URL_PARAMS,
            )
            return (snapshot_id, None, handles)
        except Exception as e:
            logger.error(f"Error triggering Bright Data profile discovery: {e}")
            return (None, "Failed to trigger competitor profile fetch with Bright Data.", [])

    async def fetch_profile_snapshot(self, handle: str) -> str | None:
        """Fetch a single Instagram profile by username (followers, posts, avatar)."""
        if settings.AI_SIMULATION_MODE or not self.api_key:
            return "mock_snapshot_id_123"

        clean_handle = handle.strip().lstrip("@")
        try:
            return await self._trigger(
                PROFILE_DATASET_ID,
                [{"url": instagram_profile_url(clean_handle)}],
                extra_params=PROFILE_COLLECT_BY_URL_PARAMS,
            )
        except Exception as e:
            logger.error("Error triggering Bright Data profile fetch for %s: %s", handle, e)
            return None

    async def get_creator_media(self, handle: str):
        """
        Fetch recent reels for a competitor profile.
        """
        if settings.AI_SIMULATION_MODE or not self.api_key:
            logger.info(f"Simulation Mode: Mocking media fetch for handle: {handle}")
            return f"mock_media_snapshot_{handle}"

        clean_handle = handle.strip().lstrip("@")
        profile_url = f"https://www.instagram.com/{clean_handle}/"
        extra_params = "&type=discover_new&discover_by=url"

        try:
            return await self._trigger(
                REELS_DATASET_ID,
                [
                    {
                        "url": profile_url,
                        "num_of_posts": 5,
                    }
                ],
                extra_params=extra_params,
            )
        except Exception as e:
            logger.error(f"Error triggering Bright Data media fetch for {handle}: {e}")
            return None

    async def get_snapshot_results(self, snapshot_id: str):
        """
        Poll snapshot until ready and return normalized-friendly raw JSON.
        """
        if snapshot_id == "mock_snapshot_id_123":
            return [
                {
                    "account": "fitness_expert_pro",
                    "full_name": "Fitness Pro",
                    "followers": 150000,
                    "posts_count": 420,
                    "avg_engagement": 0.045,
                },
                {
                    "account": "gym_daily_tips",
                    "full_name": "Gym Daily",
                    "followers": 85000,
                    "posts_count": 310,
                    "avg_engagement": 0.062,
                },
                {
                    "account": "wellness_coach_anna",
                    "full_name": "Anna Wellness",
                    "followers": 42000,
                    "posts_count": 180,
                    "avg_engagement": 0.081,
                },
            ]

        if snapshot_id.startswith("mock_media_snapshot_"):
            handle = snapshot_id.replace("mock_media_snapshot_", "")
            return [
                {
                    "id": f"vid_{handle}_1",
                    "user_posted": handle,
                    "description": f"Secrets of {handle} revealed! #growth",
                    "media_type": "VIDEO",
                    "url": "https://www.instagram.com/reels/mock/",
                    "image_url": "https://placehold.co/400",
                    "video_url": "https://example.com/mock-audio-1.mp4",
                    "view_count": 10000,
                    "like_count": 500,
                    "comment_count": 20,
                    "followers": 250000,
                    "posts_count": 890,
                },
                {
                    "id": f"vid_{handle}_2",
                    "user_posted": handle,
                    "description": f"Top tips from {handle} #lifestyle",
                    "media_type": "VIDEO",
                    "url": "https://www.instagram.com/reels/mock2/",
                    "image_url": "https://placehold.co/400",
                    "video_url": "https://example.com/mock-audio-2.mp4",
                    "view_count": 120000,
                    "like_count": 8000,
                    "comment_count": 120,
                    "followers": 250000,
                    "posts_count": 890,
                },
            ]

        url = f"{self.base_url}/snapshot/{snapshot_id}?format=json"
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(url, headers=self._headers())
                if response.status_code == 202:
                    logger.debug("Bright Data snapshot %s still processing (202)", snapshot_id)
                    return None
                if response.status_code >= 400:
                    logger.error(
                        "Bright Data snapshot failed (%s): %s",
                        response.status_code,
                        response.text,
                    )
                    response.raise_for_status()
                data = response.json()
                if not isinstance(data, list):
                    return data
                return data or []
            except Exception as e:
                logger.error(f"Error picking up results for snapshot {snapshot_id}: {e}")
                return None


social_data_client = SocialDataClient()
