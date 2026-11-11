from google import genai
from app.core.config import settings
from app.core.logger import logger
from app.schema.ai_schema import RecommendationItem, StrategicReportResponse, VideoAnalysisResponse
import json
import os
import re
import time
import asyncio

_COMPETITOR_HANDLES_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

GEMINI_DAILY_QUOTA_MESSAGE = (
    "Gemini API daily quota reached (free tier: 20 requests/day for gemini-2.5-flash). "
    "Try again tomorrow or run competitor discovery on a different day to save budget for reports."
)

GEMINI_RATE_LIMIT_MESSAGE = (
    "Gemini rate limit reached (too many requests per minute). Wait about a minute, then try again."
)

GEMINI_TRANSIENT_MESSAGE = (
    "Gemini is temporarily unavailable due to high demand. Try again in a few minutes."
)


class GeminiQuotaExceededError(Exception):
    """Raised when Gemini free-tier daily quota is exhausted."""


def get_genai_client():
    """Initializes and returns the Gemini API client."""
    if not settings.GEMINI_API_KEY:
        return None
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _build_niche_detection_prompt(
    biography: str,
    captions: list[str],
    hashtags: list[str] | None = None,
) -> str:
    captions_text = "\n- ".join(captions[:20]) if captions else "None"
    hashtags_text = ", ".join(hashtags[:20]) if hashtags else "None"
    return f"""
        Analyze the following Instagram account information and determine its specific niche.

        Biography:
        {biography or "None"}

        Recent Video Captions:
        - {captions_text}

        Most Frequent Hashtags:
        {hashtags_text}

        Return ONLY a short, descriptive name for the niche (e.g., "Fitness & Nutrition", "Tech Education", "Sustainable Fashion").
        """


def detect_niche_service_sync(
    biography: str,
    captions: list[str],
    hashtags: list[str] | None = None,
):
    """
    Synchronous version of niche detection for Celery tasks.
    Uses Gemini Flash to detect the Instagram account's niche
    based on biography, captions, and hashtags.
    """
    if settings.AI_SIMULATION_MODE:
        logger.info("AI Simulation Mode: Mocking niche detection")
        return "Lifestyle & Productivity"

    if not settings.GEMINI_API_KEY:
        logger.warning("No Gemini API key provided. Falling back to default niche.")
        return "Uncategorized"

    try:
        client = get_genai_client()
        prompt = _build_niche_detection_prompt(biography, captions, hashtags)
        if not reserve_gemini_call():
            logger.error("Gemini daily budget exhausted before niche detection")
            return None
        _throttle_gemini_rpm()
        response = client.models.generate_content(
            model=settings.AI_MODEL_FLASH,
            contents=prompt,
        )
        niche = (response.text or "").strip()
        if not niche:
            raise ValueError("Empty niche response from Gemini")
        logger.info(f"AI Niche Detection Result: {niche}")
        return niche
    except Exception as e:
        logger.error(f"Error in Gemini niche detection: {e}")
        return None


def _niche_handles_cache_key(niche: str) -> str:
    return f"competitor_handles:{niche.strip().lower()}"


_sync_redis = None


def _get_sync_redis():
    """One shared connection pool per process (redis-py clients are thread-safe)."""
    global _sync_redis
    if _sync_redis is None:
        import redis

        _sync_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _sync_redis


def _gemini_usage_key() -> str:
    """Gemini's free-tier daily quota resets at midnight Pacific time, so count by that day."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    return f"gemini_usage:{datetime.now(ZoneInfo('America/Los_Angeles')).date().isoformat()}"


def get_gemini_calls_today() -> int:
    if settings.AI_SIMULATION_MODE:
        return 0
    try:
        value = _get_sync_redis().get(_gemini_usage_key())
        return int(value) if value else 0
    except Exception as e:
        logger.warning("Could not read Gemini usage counter: %s", e)
        return 0


def remaining_gemini_budget(*, reserve: int = 0) -> int:
    """How many Gemini calls can still be made today (after reserve)."""
    if settings.AI_SIMULATION_MODE:
        return settings.GEMINI_DAILY_BUDGET
    return max(0, settings.GEMINI_DAILY_BUDGET - get_gemini_calls_today() - reserve)


def reserve_gemini_call() -> bool:
    """Atomically reserve one daily Gemini slot. Returns False when budget is exhausted."""
    if settings.AI_SIMULATION_MODE:
        return True
    try:
        redis = _get_sync_redis()
        key = _gemini_usage_key()
        count = redis.incr(key)
        if count == 1:
            redis.expire(key, 86400 * 2)
        if count > settings.GEMINI_DAILY_BUDGET:
            redis.decr(key)
            return False
        return True
    except Exception as e:
        # Fail closed: without the counter we cannot guarantee the budget.
        logger.error("Could not reserve Gemini call slot (Redis unavailable): %s", e)
        return False


def _parse_gemini_retry_seconds(error: Exception) -> int | None:
    text = str(error)
    match = re.search(r"retry in (\d+(?:\.\d+)?)s", text, re.IGNORECASE)
    if match:
        return max(1, int(float(match.group(1))))
    return None


def _is_gemini_quota_error(error: Exception) -> bool:
    text = str(error)
    return "429" in text or "RESOURCE_EXHAUSTED" in text or "quota" in text.lower()


def _is_gemini_transient_error(error: Exception) -> bool:
    text = str(error).lower()
    return "503" in text or "unavailable" in text or "high demand" in text


def _is_gemini_rate_limit_error(error: Exception) -> bool:
    """Per-minute 429, not the daily cap."""
    if not _is_gemini_quota_error(error):
        return False
    return not _is_gemini_daily_quota_error(error)


def _is_gemini_daily_quota_error(error: Exception) -> bool:
    """
    True only for the per-DAY free-tier cap, not the per-minute rate limit.

    Both errors reference the same metric (…/generate_content_free_tier_requests),
    so we key off the quotaId dimension: 'PerDay' => daily cap (retry tomorrow),
    'PerMinute' => transient rate limit (short backoff + retry).
    """
    text = str(error)
    lowered = text.lower()
    if "perminute" in lowered or "per minute" in lowered:
        return False
    return "PerDay" in text or "per day" in lowered


def _throttle_gemini_rpm() -> None:
    """
    Pace Gemini calls to stay under the free-tier per-minute request limit.

    A single report fires many flash calls in a burst (one per video + the final
    write-up), which trips the 5 rpm free-tier ceiling. This uses a Redis fixed-window
    counter so calls across all workers stay within GEMINI_MAX_RPM, sleeping into the
    next window when the current one is full.
    """
    if settings.AI_SIMULATION_MODE:
        return

    max_rpm = max(1, settings.GEMINI_MAX_RPM)
    try:
        redis = _get_sync_redis()
    except Exception as e:
        logger.warning("Could not connect to Redis for Gemini RPM throttle: %s", e)
        return

    for _ in range(6):  # safety cap: never wait more than ~a few windows
        window = int(time.time() // 60)
        key = f"gemini_rpm:{window}"
        try:
            count = redis.incr(key)
            if count == 1:
                redis.expire(key, 120)
        except Exception as e:
            logger.warning("Could not apply Gemini RPM throttle: %s", e)
            return

        if count <= max_rpm:
            return

        try:
            redis.decr(key)
        except Exception:
            pass

        sleep_for = 60 - (time.time() % 60) + 0.5
        logger.info(
            "Gemini RPM limit (%s/min) reached; waiting %.1fs for next window",
            max_rpm,
            sleep_for,
        )
        time.sleep(min(sleep_for, 60))

    logger.warning("Gemini RPM throttle exceeded max wait window; proceeding")


async def _generate_content_with_retry(
    client,
    *,
    model: str,
    contents,
    config=None,
    max_attempts: int = 5,
):
    """Call Gemini with backoff on transient/rate-limit errors; fail fast on daily quota."""
    last_error: Exception | None = None
    for attempt in range(max_attempts):
        if attempt == 0 and not settings.AI_SIMULATION_MODE and not reserve_gemini_call():
            raise GeminiQuotaExceededError(GEMINI_DAILY_QUOTA_MESSAGE)
        try:
            await asyncio.to_thread(_throttle_gemini_rpm)
            kwargs = {"model": model, "contents": contents}
            if config is not None:
                kwargs["config"] = config
            return await asyncio.to_thread(client.models.generate_content, **kwargs)
        except Exception as e:
            last_error = e
            logger.error("Gemini generate_content failed (attempt %s): %s", attempt + 1, e)
            if _is_gemini_daily_quota_error(e):
                raise GeminiQuotaExceededError(GEMINI_DAILY_QUOTA_MESSAGE) from e
            if attempt < max_attempts - 1:
                if _is_gemini_rate_limit_error(e):
                    delay = _parse_gemini_retry_seconds(e) or 30
                    await asyncio.sleep(min(delay, 60))
                    continue
                if _is_gemini_transient_error(e):
                    await asyncio.sleep(min(5 * (attempt + 1), 30))
                    continue
            break

    if last_error:
        if _is_gemini_daily_quota_error(last_error):
            raise GeminiQuotaExceededError(GEMINI_DAILY_QUOTA_MESSAGE) from last_error
        if _is_gemini_rate_limit_error(last_error):
            raise RuntimeError(GEMINI_RATE_LIMIT_MESSAGE) from last_error
        if _is_gemini_transient_error(last_error):
            raise RuntimeError(GEMINI_TRANSIENT_MESSAGE) from last_error
        raise last_error
    raise RuntimeError("Gemini generate_content failed with no error")


def get_cached_competitor_handles_sync(niche: str, exclude_handle: str | None = None) -> list[str]:
    try:
        cached = _get_sync_redis().get(_niche_handles_cache_key(niche))
        if not cached:
            return []
        handles = json.loads(cached)
        if not isinstance(handles, list):
            return []
        cleaned = []
        for handle in handles:
            if not isinstance(handle, str):
                continue
            value = handle.strip().lstrip("@")
            if value and value.lower() != (exclude_handle or "").lower():
                cleaned.append(value)
        return cleaned
    except Exception as e:
        logger.warning("Could not read competitor handle cache: %s", e)
        return []


def _cache_competitor_handles_sync(niche: str, handles: list[str]) -> None:
    if not handles:
        return
    try:
        _get_sync_redis().setex(
            _niche_handles_cache_key(niche),
            _COMPETITOR_HANDLES_CACHE_TTL_SECONDS,
            json.dumps(handles),
        )
    except Exception as e:
        logger.warning("Could not cache competitor handles: %s", e)


def invalidate_competitor_handles_cache_sync(niche: str, username: str | None = None) -> None:
    """Drop cached Gemini handle suggestions so the next discovery gets a fresh list."""
    keys = [_niche_handles_cache_key(niche.strip().lower())]
    if username:
        keys.append(_niche_handles_cache_key(f"{niche.strip().lower()}:{username}"))
    try:
        redis = _get_sync_redis()
        for key in keys:
            redis.delete(key)
        logger.info("Invalidated competitor handle cache for niche=%s", niche[:80])
    except Exception as e:
        logger.warning("Could not invalidate competitor handle cache: %s", e)


def suggest_competitor_handles_sync(
    niche: str,
    exclude_handle: str | None = None,
    max_handles: int = 10,
    account_context: dict | None = None,
    force_refresh: bool = False,
) -> tuple[list[str], str | None]:
    """
    Suggest public Instagram competitor handles for a niche using Gemini.
    Returns (handles, error_message). Uses Redis cache unless force_refresh is True.
    """
    if settings.AI_SIMULATION_MODE:
        return (["nike", "adidas", "underarmour", "gymshark", "fitness"][:max_handles], None)

    cache_key_suffix = ""
    if account_context:
        cache_key_suffix = f":{account_context.get('username', '')}"
    cache_lookup_niche = f"{niche.strip().lower()}{cache_key_suffix}"

    if not force_refresh:
        cached = get_cached_competitor_handles_sync(cache_lookup_niche, exclude_handle=exclude_handle)
        if cached:
            logger.info("Using cached competitor handles for niche: %s", niche)
            return (cached[:max_handles], None)

    if not settings.GEMINI_API_KEY:
        return ([], "Gemini API key is not configured.")

    client = get_genai_client()
    exclude_line = f"Do not include @{exclude_handle}." if exclude_handle else ""

    context_block = ""
    if account_context:
        bio = account_context.get("biography") or ""
        captions = account_context.get("sample_captions") or []
        followers = account_context.get("followers_count") or 0
        username = account_context.get("username") or ""
        caption_lines = "\n".join(f"- {c[:200]}" for c in captions[:5])
        context_block = f"""
        Creator context (@{username}, {followers:,} followers):
        Bio: {bio or "N/A"}
        Recent Reel captions:
        {caption_lines or "- N/A"}
        """

    prompt = f"""
        Find {max_handles} Instagram competitor accounts for benchmarking Reels performance.

        Target niche: "{niche}"
        {context_block}

        Requirements — every suggested account MUST:
        1. Post primarily in the SAME specific niche as the creator above (not generic unrelated lifestyle/fashion unless that is the niche)
        2. Be a real, active, public Instagram account that posts Reels regularly
        3. Have at least 10,000 Instagram followers — we verify follower counts after your response, so do NOT guess. Prefer active Reels creators in this niche (e.g. traversymedia, codewithharry — only if they truly have 10k+ on Instagram, not just on YouTube/Twitter)
        4. Use the exact current Instagram username (no typos, no alternate spellings like fireship.io unless that is the real handle)
        5. Be a realistic peer or aspirational competitor (similar audience, not unrelated mega-celebrities)

        {exclude_line}

        Return ONLY a JSON array of handle strings without @ symbols.
        Example: ["handle1", "handle2"]
        """

    last_error: Exception | None = None
    for attempt in range(3):
        try:
            if not reserve_gemini_call():
                return ([], GEMINI_DAILY_QUOTA_MESSAGE)
            _throttle_gemini_rpm()
            response = client.models.generate_content(
                model=settings.AI_MODEL_FLASH,
                contents=prompt,
                config={"response_mime_type": "application/json"},
            )
            handles = json.loads(response.text or "[]")
            cleaned = []
            for handle in handles:
                if not isinstance(handle, str):
                    continue
                value = handle.strip().lstrip("@")
                if value and value.lower() != (exclude_handle or "").lower():
                    cleaned.append(value)
            cleaned = cleaned[:max_handles]
            if cleaned:
                _cache_competitor_handles_sync(cache_lookup_niche, cleaned)
            return (cleaned, None)
        except Exception as e:
            last_error = e
            logger.error("Error suggesting competitor handles (attempt %s): %s", attempt + 1, e)
            if (
                _is_gemini_quota_error(e)
                and not _is_gemini_daily_quota_error(e)
                and attempt < 2
            ):
                delay = _parse_gemini_retry_seconds(e) or 30
                time.sleep(min(delay, 60))
                continue
            break

    if last_error and _is_gemini_quota_error(last_error):
        return (
            [],
            "Gemini API daily quota reached (free tier: 20 requests/day for gemini-2.5-flash). "
            "Try again tomorrow, enable billing, or add competitors manually.",
        )
    return ([], "Could not suggest competitor handles from Gemini.")


async def analyze_video_service(caption: str, transcript: str, hashtags: list[str] = None):
    """
    Uses Gemini Flash to analyze an individual video's creative and strategic elements.
    Returns a structured VideoAnalysisResponse object.
    """
    # Check settings for AI simulation mode (works in both FastAPI and Celery contexts)
    ai_simulation = settings.AI_SIMULATION_MODE
    
    if ai_simulation:
        logger.info("AI Simulation Mode: Mocking video analysis")
        has_transcript = bool((transcript or "").strip())
        return VideoAnalysisResponse(
            topic="Mock Topic",
            category="Educational",
            content_pillar="How-to",
            hook="This is a mock hook",
            hook_score=80,
            pacing="Fast",
            visual_style="Bright and energetic",
            strengths=["Clear audio", "Good lighting"],
            weaknesses=["Text is too small"],
            confidence=88 if has_transcript else 58,
        )

    if not settings.GEMINI_API_KEY:
        logger.warning("No Gemini API key provided. Cannot analyze video.")
        return None

    try:
        client = get_genai_client()
        
        hashtags_text = ", ".join(hashtags) if hashtags else "None"
        transcript_note = ""
        if not (transcript or "").strip():
            transcript_note = (
                "\nNote: No spoken transcript is available. "
                "Assess using caption, hashtags, and metrics only. Set confidence below 70."
            )
        
        prompt = f"""
        Analyze the following Instagram Reel and return a strategic creative assessment.

        Caption:
        {caption}

        Transcript:
        {transcript or "Not available."}
        {transcript_note}

        Hashtags:
        {hashtags_text}

        Scoring rules (required):
        - hook_score: integer 0-100 rating the opening hook (first 1-3 seconds / first line).
          80-100 = stops the scroll, 50-79 = decent, below 50 = weak or slow.
        - confidence: integer 0-100 for how confident you are in this assessment.
          Use 70+ when a transcript is available; cap below 70 when transcript is missing.

        Evaluate hook, pacing, category, content pillar, strengths, and weaknesses.
        """
        
        response = await _generate_content_with_retry(
            client,
            model=settings.AI_MODEL_FLASH,
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': VideoAnalysisResponse,
            },
        )
        
        analysis = response.parsed
        logger.info(f"AI Video Analysis successful for topic: {analysis.topic}")
        return analysis

    except GeminiQuotaExceededError:
        raise
    except Exception as e:
        logger.error(f"Error in Gemini video analysis: {e}")
        return None

async def generate_strategic_report_service(user_data: dict, competitor_data: list):
    """
    Acting as a Senior Social Media Strategist, this function compares the user's content 
    against competitors and generates a comprehensive growth roadmap.
    """
    # Check settings for AI simulation mode (works in both FastAPI and Celery contexts)
    ai_simulation = settings.AI_SIMULATION_MODE
    
    if ai_simulation:
        logger.info("AI Simulation Mode: Mocking strategic report")
        return StrategicReportResponse(
            summary="This is a mock strategy report summary.",
            market_trends=["Trend 1", "Trend 2"],
            competitor_strengths=["Strength A"],
            user_gaps=["Gap X"],
            user_advantages=["Advantage Y"],
            roadmap=[
                RecommendationItem(
                    title="Open with the payoff",
                    description="State the result in the first second, then show how you got there.",
                    priority=5,
                    evidence="Simulated: competitor Reels with direct hooks score higher.",
                    type="hook",
                ),
                RecommendationItem(
                    title="Post two how-to Reels a week",
                    description="Your how-to pillar has the best engagement; make it a regular slot.",
                    priority=3,
                    evidence="Simulated: how-to content leads your pillar table.",
                    type="topic",
                ),
            ],
            report_markdown="# Mock Strategy Report\nYour growth roadmap is here..."
        )

    if not settings.GEMINI_API_KEY:
        return None

    try:
        client = get_genai_client()
        
        prompt = f"""
        You are a world-class Instagram Growth Strategist. Analyze the following data for an account and its competitors.
        
        USER DATA:
        {json.dumps(user_data, indent=2)}
        
        COMPETITOR DATA:
        {json.dumps(competitor_data, indent=2)}
        
        TASK:
        1. Identify the core market trends based on competitor success.
        2. Highlight the user's specific content gaps and competitive advantages.
        3. Provide a clear, 30-day roadmap with 3-5 prioritized recommendations.
        4. Generate a detailed report in Markdown format for the user to read.
        """
        
        response = await _generate_content_with_retry(
            client,
            model=settings.AI_MODEL_PRO,
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': StrategicReportResponse,
            },
        )
        
        report = response.parsed
        logger.info("AI Strategic Report generated successfully.")
        return report

    except GeminiQuotaExceededError:
        raise
    except Exception as e:
        logger.error(f"Error in Gemini strategic report generation: {e}")
        if _is_gemini_daily_quota_error(e):
            raise GeminiQuotaExceededError(GEMINI_DAILY_QUOTA_MESSAGE) from e
        raise
