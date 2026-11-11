import asyncio
from uuid import UUID
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.utils.instagram_handle import normalize_handle as _normalize_handle
from app.core.database import AsyncSessionLocal, run_async_task
from app.core.logger import logger
from app.core.celery_app import celery_app
from app.core.client.social_data import social_data_client, normalize_competitor_media
from app.model.analysis_job import AnalysisJob
from app.model.competitor_accounts import CompetitorAccount
from app.model.competitor_media import CompetitorMedia
from app.model.instagram_accounts import InstagramAccount
from app.model.media_items import MediaItem
from app.service.transcript_service import run_bulk_transcription_service
from app.utils.competitor_metrics import (
    engagement_rate_to_rank,
)
from app.utils.cdn_image import prefetch_competitor_avatar
from app.service.job_utils import (
    job_should_start,
    mark_failed,
    mark_running,
    mark_succeeded,
    reconcile_job,
    set_progress,
)


# MVP limits — store up to 10, deep-fetch reels for top 5 only (saves Bright Data + Gemini analysis credits)
MAX_COMPETITORS_TO_STORE = 10
MAX_COMPETITORS_TO_ANALYZE = 5
MAX_VIDEOS_PER_COMPETITOR = 5

# Guardrails for auto-discovery quality (Bright Data can return tiny accounts).
MIN_COMPETITOR_FOLLOWERS = 10_000
MIN_COMPETITOR_MEDIA_COUNT = 20
DISCOVERY_FOLLOWER_TIERS = (10_000,)
# Ask Gemini for extra handles — Bright Data often omits some; filtering shrinks the list further.
GEMINI_HANDLES_TO_REQUEST = 15
# Bright Data batch profile scrapes often need 5–10 min; 202 until all handles are ready.
PROFILE_SNAPSHOT_POLL_DELAYS_SECONDS = [0, 15, 20, 25, 30] + [30] * 12 + [45] * 4

# Reuse competitor scrape results for reports within this window.
REPORT_COMPETITOR_FRESHNESS_SECONDS = 7 * 24 * 60 * 60

MEDIA_SNAPSHOT_POLL_DELAYS_SECONDS = [0, 5, 8, 10, 12, 15, 15, 15, 15, 15]

# initial = first onboarding discover (may use cached Gemini handles)
# refresh_suggestions = explicit rediscover (fresh Gemini + replace auto-discovered set)
DISCOVERY_MODE_INITIAL = "initial"
DISCOVERY_MODE_REFRESH = "refresh_suggestions"


from app.utils.time import utc_now


async def reconcile_competitor_discovery_job(job: AnalysisJob, db: AsyncSession) -> AnalysisJob:
    """Fail stale competitor discovery jobs."""
    if job.job_type != "competitor_discovery":
        return job
    return await reconcile_job(
        job,
        db,
        queued_message="Discovery timed out before starting. Please try again.",
        running_message="Discovery timed out. Please try again.",
    )


async def _get_running_competitor_job(user_id: UUID, db: AsyncSession) -> AnalysisJob | None:
    stmt = (
        select(AnalysisJob)
        .where(
            AnalysisJob.user_id == user_id,
            AnalysisJob.job_type == "competitor_discovery",
            AnalysisJob.status.in_(("queued", "running")),
        )
        .order_by(AnalysisJob.created_at.desc())
    )
    jobs = (await db.exec(stmt)).all()
    for job in jobs:
        job = await reconcile_competitor_discovery_job(job, db)
        if job.status in ("queued", "running"):
            return job
    return None


async def _get_running_discovery_job(user_id: UUID, db: AsyncSession) -> AnalysisJob | None:
    return await _get_running_competitor_job(user_id, db)


def _is_manual_competitor(competitor: CompetitorAccount) -> bool:
    meta = competitor.source_metadata or {}
    return meta.get("source") == "manual"


def _passes_quality_bar(
    followers: int,
    media_count: int,
    min_followers: int = MIN_COMPETITOR_FOLLOWERS,
) -> bool:
    return followers >= min_followers and media_count >= MIN_COMPETITOR_MEDIA_COUNT


def _strictest_follower_tier(followers: int) -> int | None:
    """Index into DISCOVERY_FOLLOWER_TIERS for the strictest tier this account qualifies for."""
    for index, tier in enumerate(DISCOVERY_FOLLOWER_TIERS):
        if followers >= tier:
            return index
    return None


async def _purge_auto_discovered_competitors(db: AsyncSession, user_id: UUID) -> None:
    """Replace prior auto-discovery results on each new discovery run."""
    stmt = select(CompetitorAccount).where(CompetitorAccount.user_id == user_id)
    for competitor in (await db.exec(stmt)).all():
        if _is_manual_competitor(competitor):
            continue
        await db.delete(competitor)
    await db.commit()


async def add_competitor_by_handle_service(user_id: UUID, handle: str, db: AsyncSession):
    """
    Manually track a competitor by Instagram handle and queue media import.
    """
    clean_handle = _normalize_handle(handle)

    stmt = select(CompetitorAccount).where(CompetitorAccount.user_id == user_id)
    existing = (await db.exec(stmt)).all()

    if len(existing) >= MAX_COMPETITORS_TO_STORE:
        raise ValueError(f"Maximum of {MAX_COMPETITORS_TO_STORE} competitors allowed.")

    if any(c.handle.lower() == clean_handle.lower() for c in existing):
        raise ValueError("This competitor is already tracked.")

    competitor = CompetitorAccount(
        user_id=user_id,
        provider="brightdata",
        handle=clean_handle,
        display_name=clean_handle,
        followers_count=0,
        media_count=0,
        engagement_rank=0,
        source_metadata={"source": "manual"},
        last_synced_at=utc_now(),
    )
    db.add(competitor)
    await db.commit()
    await db.refresh(competitor)

    celery_app.send_task(
        "app.service.competitor_service.fetch_competitor_media_task",
        args=[str(competitor.id), str(user_id)],
    )

    return competitor


async def rediscover_competitors_service(user_id: UUID, db: AsyncSession):
    """
    Ask Gemini for fresh competitor handles and replace the auto-discovered set.
    """
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
    account = (await db.exec(stmt)).first()
    if not account:
        raise ValueError("Instagram account not found.")
    if not account.niche_confirmed:
        raise ValueError("Confirm your niche before discovering competitors.")

    running = await _get_running_competitor_job(user_id, db)
    if running:
        logger.info(
            "Competitor job already in progress for user %s (job %s); returning existing job",
            user_id,
            running.id,
        )
        return running

    from app.service.ai_service import invalidate_competitor_handles_cache_sync

    invalidate_competitor_handles_cache_sync(
        account.niche_confirmed,
        account.username,
    )

    return await discover_competitors_service(
        user_id,
        account.niche_confirmed,
        db,
        mode=DISCOVERY_MODE_REFRESH,
    )


def enqueue_competitor_profile_refresh(competitor_id: UUID) -> None:
    celery_app.send_task(
        "app.service.competitor_service.refresh_competitor_profile_task",
        args=[str(competitor_id)],
    )


@celery_app.task(name="app.service.competitor_service.refresh_competitor_profile_task")
def refresh_competitor_profile_task(competitor_id: str):
    return run_async_task(_refresh_competitor_profile_internal, competitor_id)


async def _refresh_competitor_profile_internal(competitor_id: str):
    """Re-scrape one profile for a fresh picture link (the old signed CDN link expired)."""
    async with AsyncSessionLocal() as db:
        try:
            await _refresh_competitor_profiles(db, [UUID(competitor_id)], force=True)
        except Exception as e:
            logger.exception(f"Error refreshing profile for competitor {competitor_id}: {e}")


@celery_app.task(name="app.service.competitor_service.fetch_competitor_media_task")
def fetch_competitor_media_task(competitor_id: str, user_id: str):
    return run_async_task(_fetch_competitor_media_internal, competitor_id, user_id)


async def _fetch_competitor_media_internal(competitor_id: str, user_id: str):
    async with AsyncSessionLocal() as db:
        try:
            comp_uuid = UUID(competitor_id)
            # Profile stats first so the UI is not stuck at 0 while reels scrape.
            await _refresh_competitor_profiles(db, [comp_uuid], force=True)
            await _fetch_all_competitor_media(db, [comp_uuid], UUID(user_id))
            await run_bulk_transcription_service(UUID(user_id), db)
        except Exception as e:
            logger.exception(f"Error fetching media for competitor {competitor_id}: {e}")


async def discover_competitors_service(
    user_id: UUID,
    niche: str,
    db: AsyncSession,
    mode: str = DISCOVERY_MODE_INITIAL,
):
    """
    Queue competitor discovery. Returns immediately; Gemini + Bright Data run in Celery.
    mode=initial allows cached Gemini handles; mode=refresh_suggestions forces fresh handles.
    """
    running = await _get_running_competitor_job(user_id, db)
    if running:
        return running

    job = AnalysisJob(
        user_id=user_id,
        job_type="competitor_discovery",
        status="queued",
        progress=0,
        input_payload={"niche": niche, "mode": mode},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    celery_app.send_task(
        "app.service.competitor_service.poll_competitor_results_task",
        args=[str(job.id), str(user_id)],
    )

    return job


@celery_app.task(name="app.service.competitor_service.poll_competitor_results_task")
def poll_competitor_results_task(job_id: str, user_id: str):
    """
    Celery task: Gemini handle suggestions → Bright Data profiles → save competitors.
    Reel fetching runs in a separate background task so discovery can finish quickly.
    """
    return run_async_task(_poll_results_internal, job_id, user_id)


@celery_app.task(name="app.service.competitor_service.fetch_competitor_media_batch_task")
def fetch_competitor_media_batch_task(competitor_ids: list[str], user_id: str):
    return run_async_task(_fetch_media_batch_internal, competitor_ids, user_id)


async def _fetch_media_batch_internal(competitor_ids: list[str], user_id: str):
    async with AsyncSessionLocal() as db:
        try:
            ids = [UUID(cid) for cid in competitor_ids]
            await _fetch_all_competitor_media(db, ids, UUID(user_id))
            await run_bulk_transcription_service(UUID(user_id), db)
        except Exception as e:
            logger.exception("Error in competitor media batch fetch: %s", e)


async def _poll_results_internal(job_id: str, user_id: str):
    async with AsyncSessionLocal() as db:
        job = None
        try:
            job = await db.get(AnalysisJob, UUID(job_id))
            if not job_should_start(job):
                return

            niche = job.input_payload.get("niche", "")
            discovery_mode = job.input_payload.get("mode", DISCOVERY_MODE_INITIAL)
            force_refresh = discovery_mode == DISCOVERY_MODE_REFRESH
            user_uuid = UUID(user_id)

            mark_running(job)
            await db.commit()

            account_stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_uuid)
            account = (await db.exec(account_stmt)).first()
            exclude_handle = account.username if account else None

            existing_stmt = select(CompetitorAccount).where(CompetitorAccount.user_id == user_uuid)
            existing_competitors = (await db.exec(existing_stmt)).all()
            fallback_handles = [c.handle for c in existing_competitors]

            media_stmt = select(MediaItem).where(MediaItem.user_id == user_uuid).limit(10)
            media_items = (await db.exec(media_stmt)).all()
            account_context = {
                "username": account.username if account else "",
                "biography": account.biography if account else "",
                "followers_count": account.followers_count if account else 0,
                "sample_captions": [m.caption for m in media_items if m.caption],
            }

            snapshot_id, search_error, suggested_handles = await social_data_client.search_creators_by_niche(
                niche,
                exclude_handle=exclude_handle,
                max_handles=GEMINI_HANDLES_TO_REQUEST,
                fallback_handles=fallback_handles,
                account_context=account_context,
                force_refresh=force_refresh,
            )
            if not snapshot_id:
                raise Exception(search_error or "Failed to trigger competitor search with provider.")

            job.input_payload = {
                **job.input_payload,
                "snapshot_id": snapshot_id,
                "suggested_handles": suggested_handles,
            }
            set_progress(job, 10)
            await db.commit()

            # STAGE 2: Wait for profile snapshot (~10 min max)
            results = await _poll_profile_snapshot(
                snapshot_id,
                job=job,
                db=db,
                progress_start=10,
                progress_end=90,
                log_label="discovery",
            )

            if not results:
                raise Exception("Timed out waiting for competitor discovery data from provider.")

            # STAGE 3: Save accounts that pass quality bar (min 10k followers, 20 posts).
            competitor_ids = await _process_and_save_competitors(
                db,
                results,
                user_uuid,
                suggested_handles=suggested_handles,
            )

            if not competitor_ids:
                from app.service.ai_service import invalidate_competitor_handles_cache_sync

                invalidate_competitor_handles_cache_sync(niche, account_context.get("username"))
                raise Exception(
                    f"No competitors met quality bar (tried down to {DISCOVERY_FOLLOWER_TIERS[-1]:,} "
                    f"followers, min {MIN_COMPETITOR_MEDIA_COUNT} posts). "
                    "Try adding handles manually."
                )

            mark_succeeded(job)
            await db.commit()

            # STAGE 4: Reel fetch + transcription in background (not part of discovery job polling)
            top_ids = [str(cid) for cid in competitor_ids[:MAX_COMPETITORS_TO_ANALYZE]]
            celery_app.send_task(
                "app.service.competitor_service.fetch_competitor_media_batch_task",
                args=[top_ids, user_id],
            )

        except Exception as e:
            logger.exception(f"Error in competitor discovery task: {e}")
            if job:
                await db.rollback()
                failed_job = await db.get(AnalysisJob, UUID(job_id))
                if failed_job:
                    mark_failed(failed_job, str(e))
                    db.add(failed_job)
                    await db.commit()


async def _poll_profile_snapshot(
    snapshot_id: str,
    *,
    job: AnalysisJob | None = None,
    db: AsyncSession | None = None,
    progress_start: int = 10,
    progress_end: int = 90,
    log_label: str = "profile",
) -> list | None:
    """Poll a Bright Data batch snapshot until ready or timeout."""
    results = None
    for attempt, delay in enumerate(PROFILE_SNAPSHOT_POLL_DELAYS_SECONDS):
        if delay:
            await asyncio.sleep(delay)
        results = await social_data_client.get_snapshot_results(snapshot_id)
        if results is not None:
            return results
        logger.info(
            "Bright Data %s snapshot %s not ready (attempt %d/%d)",
            log_label,
            snapshot_id,
            attempt + 1,
            len(PROFILE_SNAPSHOT_POLL_DELAYS_SECONDS),
        )
        if job and db is not None:
            span = max(progress_end - progress_start, 1)
            set_progress(
                job,
                min(
                    progress_end,
                    progress_start + int(((attempt + 1) / len(PROFILE_SNAPSHOT_POLL_DELAYS_SECONDS)) * span),
                ),
            )
            db.add(job)
            await db.commit()
    return None


async def _get_top_competitors(db: AsyncSession, user_id: UUID) -> list[CompetitorAccount]:
    stmt = (
        select(CompetitorAccount)
        .where(CompetitorAccount.user_id == user_id)
        .order_by(CompetitorAccount.followers_count.desc(), CompetitorAccount.engagement_rank.desc())
        .limit(MAX_COMPETITORS_TO_ANALYZE)
    )
    return list((await db.exec(stmt)).all())


async def competitor_data_needs_refresh(db: AsyncSession, user_id: UUID) -> bool:
    """True when competitor profiles, media, or analysis are missing or stale."""
    from app.model.video_analysis import VideoAnalysis, MediaSource

    top = await _get_top_competitors(db, user_id)
    if not top:
        return False

    now = utc_now()
    for competitor in top:
        synced_at = competitor.last_synced_at
        if synced_at is None:
            return True
        age = (now - synced_at.replace(tzinfo=None)).total_seconds()
        if age > REPORT_COMPETITOR_FRESHNESS_SECONDS:
            return True

        media_stmt = select(CompetitorMedia).where(
            CompetitorMedia.competitor_account_id == competitor.id,
            CompetitorMedia.user_id == user_id,
        )
        if not (await db.exec(media_stmt)).first():
            return True

    analysis_stmt = select(VideoAnalysis).where(
        VideoAnalysis.user_id == user_id,
        VideoAnalysis.media_source == MediaSource.COMPETITOR,
    )
    if not (await db.exec(analysis_stmt)).first():
        return True

    return False


async def prepare_competitor_data_for_report(
    db: AsyncSession,
    user_id: UUID,
    job: AnalysisJob | None = None,
) -> bool:
    """
    Refresh competitor profiles + reels when stale before report generation.
    Returns True if a Bright Data refresh ran.
    """
    if not await competitor_data_needs_refresh(db, user_id):
        logger.info("Competitor data still fresh for user %s — skipping Bright Data", user_id)
        return False

    top = await _get_top_competitors(db, user_id)
    if not top:
        return False

    handles = [c.handle for c in top]
    if job:
        set_progress(job, 5)
        db.add(job)
        await db.commit()

    snapshot_id, fetch_error = await social_data_client.fetch_profiles_for_handles(handles)
    if not snapshot_id:
        raise Exception(fetch_error or "Failed to refresh competitor profiles for report.")

    results = await _poll_profile_snapshot(
        snapshot_id,
        job=job,
        db=db,
        progress_start=8,
        progress_end=35,
        log_label="report-profile",
    )
    if not results:
        raise Exception(
            "Timed out waiting for competitor profiles before report generation. Try again shortly."
        )

    updated_ids = await _update_existing_competitors_from_profiles(db, results, user_id)
    if not updated_ids:
        raise Exception("Could not refresh competitor profiles before report generation.")

    if job:
        set_progress(job, 40)
        db.add(job)
        await db.commit()

    await _fetch_all_competitor_media(db, updated_ids[:MAX_COMPETITORS_TO_ANALYZE], user_id)

    if job:
        set_progress(job, 55)
        db.add(job)
        await db.commit()

    logger.info(
        "Prepared competitor Bright Data for report (user=%s, accounts=%d)",
        user_id,
        len(updated_ids),
    )
    return True


async def _update_existing_competitors_from_profiles(
    db: AsyncSession,
    results: list,
    user_id: UUID,
) -> list[UUID]:
    """Update stats for already-tracked competitors from Bright Data profile rows."""
    from app.core.client.social_data import normalize_competitor_profiles

    profiles = normalize_competitor_profiles(results) if results else []
    if not profiles:
        return []

    existing_stmt = select(CompetitorAccount).where(CompetitorAccount.user_id == user_id)
    existing_by_handle = {
        c.handle.lower(): c for c in (await db.exec(existing_stmt)).all()
    }

    touched_ids: list[UUID] = []
    for entry in profiles:
        handle = (entry.get("handle") or "").strip().lstrip("@")
        if not handle:
            continue
        competitor = existing_by_handle.get(handle.lower())
        if not competitor:
            logger.info("Resync skipping untracked profile @%s", handle)
            continue

        followers = int(entry.get("followers_count", 0) or 0)
        media_count = int(entry.get("media_count", 0) or 0)
        engagement_rank = engagement_rate_to_rank(entry.get("engagement_rate", 0))
        competitor.display_name = entry.get("display_name") or competitor.display_name
        if entry.get("profile_picture_url"):
            competitor.profile_picture_url = entry.get("profile_picture_url")
            await prefetch_competitor_avatar(competitor.id, competitor.profile_picture_url)
        if followers > 0:
            competitor.followers_count = followers
        if media_count > 0:
            competitor.media_count = media_count
        competitor.engagement_rank = engagement_rank
        competitor.last_synced_at = utc_now()
        db.add(competitor)
        touched_ids.append(competitor.id)

    await db.commit()
    logger.info("Resynced %d tracked competitor profile(s)", len(touched_ids))
    return touched_ids


async def _process_and_save_competitors(
    db: AsyncSession,
    results: list,
    user_id: UUID,
    suggested_handles: list[str] | None = None,
):
    """
    Replace auto-discovered competitors with Bright Data profiles that pass the quality bar (10k+ followers).
    """
    from app.core.client.social_data import normalize_competitor_profiles

    await _purge_auto_discovered_competitors(db, user_id)

    profiles = normalize_competitor_profiles(results) if results else []
    if not profiles:
        return []

    floor_tier = DISCOVERY_FOLLOWER_TIERS[-1]
    allowed_handles: set[str] | None = None
    if suggested_handles:
        allowed_handles = {h.strip().lstrip("@").lower() for h in suggested_handles if h}

    if allowed_handles:
        returned_handles = {
            (e.get("handle") or "").strip().lstrip("@").lower()
            for e in profiles
            if e.get("handle")
        }
        missing = sorted(allowed_handles - returned_handles)
        if missing:
            logger.warning(
                "Bright Data returned no profile for %d suggested handle(s): %s",
                len(missing),
                ", ".join(f"@{h}" for h in missing[:8]),
            )

    existing_stmt = select(CompetitorAccount).where(CompetitorAccount.user_id == user_id)
    existing_by_handle = {
        c.handle.lower(): c for c in (await db.exec(existing_stmt)).all()
    }

    # Refresh stats for manually added handles only.
    for entry in profiles:
        handle = (entry.get("handle") or "").strip().lstrip("@")
        if not handle:
            continue
        if allowed_handles is not None and handle.lower() not in allowed_handles:
            logger.info("Skipping unexpected profile @%s (not in Gemini handle list)", handle)
            continue
        existing = existing_by_handle.get(handle.lower())
        if not existing or not _is_manual_competitor(existing):
            continue
        followers = int(entry.get("followers_count", 0) or 0)
        media_count = int(entry.get("media_count", 0) or 0)
        engagement_rank = engagement_rate_to_rank(entry.get("engagement_rate", 0))
        existing.display_name = entry.get("display_name") or existing.display_name
        if entry.get("profile_picture_url"):
            existing.profile_picture_url = entry.get("profile_picture_url")
            await prefetch_competitor_avatar(existing.id, existing.profile_picture_url)
        if followers > existing.followers_count:
            existing.followers_count = followers
        if media_count > existing.media_count:
            existing.media_count = media_count
        if engagement_rank > 0:
            existing.engagement_rank = engagement_rank
        existing.last_synced_at = utc_now()
        db.add(existing)

    ranked_candidates: list[tuple[int, dict]] = []
    for entry in profiles:
        handle = (entry.get("handle") or "").strip().lstrip("@")
        if not handle or handle.lower() in existing_by_handle:
            continue
        if allowed_handles is not None and handle.lower() not in allowed_handles:
            continue
        followers = int(entry.get("followers_count", 0) or 0)
        media_count = int(entry.get("media_count", 0) or 0)
        tier_index = _strictest_follower_tier(followers)
        if tier_index is None or not _passes_quality_bar(followers, media_count, floor_tier):
            logger.info(
                "Skipping @%s — %s followers, %s posts (min %s / %s)",
                handle,
                followers,
                media_count,
                floor_tier,
                MIN_COMPETITOR_MEDIA_COUNT,
            )
            continue
        ranked_candidates.append((tier_index, entry))

    # Strictest tier first, then highest followers within that tier.
    ranked_candidates.sort(
        key=lambda item: (
            item[0],
            -int(item[1].get("followers_count", 0) or 0),
            -engagement_rate_to_rank(item[1].get("engagement_rate", 0)),
        ),
    )

    saved_ids: list[UUID] = []
    manual_count = len(existing_by_handle)
    slots = MAX_COMPETITORS_TO_STORE - manual_count
    for tier_index, entry in ranked_candidates[: max(0, slots)]:
        handle = (entry.get("handle") or "").strip().lstrip("@")
        followers = int(entry.get("followers_count", 0) or 0)
        media_count = int(entry.get("media_count", 0) or 0)
        min_followers = DISCOVERY_FOLLOWER_TIERS[tier_index]
        engagement_rank = engagement_rate_to_rank(entry.get("engagement_rate", 0))
        competitor = CompetitorAccount(
            user_id=user_id,
            provider="brightdata",
            handle=handle,
            display_name=entry.get("display_name") or handle,
            profile_picture_url=entry.get("profile_picture_url"),
            followers_count=followers,
            media_count=media_count,
            engagement_rank=engagement_rank,
            source_metadata={
                "source": "auto_discovery",
                "follower_tier": min_followers,
            },
            last_synced_at=utc_now(),
        )
        db.add(competitor)
        await db.flush()
        saved_ids.append(competitor.id)
        if competitor.profile_picture_url:
            await prefetch_competitor_avatar(competitor.id, competitor.profile_picture_url)
        existing_by_handle[handle.lower()] = competitor

    await db.commit()
    tier_counts: dict[int, int] = {}
    for tier_index, entry in ranked_candidates[: len(saved_ids)]:
        tier_counts[tier_index] = tier_counts.get(tier_index, 0) + 1
    logger.info(
        "Saved %d auto-discovered competitors (tiers: %s)",
        len(saved_ids),
        {
            DISCOVERY_FOLLOWER_TIERS[i]: tier_counts.get(i, 0)
            for i in sorted(tier_counts)
        },
    )
    return saved_ids


async def _fetch_all_competitor_media(db: AsyncSession, competitor_ids: list[UUID], user_id: UUID):
    """
    Triggers media fetch for each competitor and waits for results.
    """
    snapshots = []
    for comp_id in competitor_ids:
        competitor = await db.get(CompetitorAccount, comp_id)
        if not competitor:
            continue
        snapshot_id = await social_data_client.get_creator_media(competitor.handle)
        if snapshot_id:
            snapshots.append({"comp_id": comp_id, "snapshot_id": snapshot_id})

    for attempt, delay in enumerate(MEDIA_SNAPSHOT_POLL_DELAYS_SECONDS):
        if delay and attempt > 0:
            await asyncio.sleep(delay)
        remaining = []
        for s in snapshots:
            competitor = await db.get(CompetitorAccount, s["comp_id"])
            if not competitor:
                continue
            media_results = await social_data_client.get_snapshot_results(s["snapshot_id"])
            if media_results:
                await _save_competitor_media(db, s["comp_id"], user_id, media_results)
            else:
                remaining.append(s)

        snapshots = remaining
        if not snapshots:
            break


async def _enrich_competitor_from_provider_entry(
    db: AsyncSession, competitor_id: UUID, entry: dict
) -> None:
    """Fill in profile stats from Bright Data profile rows (not reel/post rows)."""
    competitor = await db.get(CompetitorAccount, competitor_id)
    if not competitor or not entry:
        return

    from app.core.client.social_data import _coerce_int, _is_normalized_profile, _is_profile_record

    is_profile_row = _is_profile_record(entry) or _is_normalized_profile(entry)

    if is_profile_row:
        followers = _coerce_int(
            entry.get("followers")
            or entry.get("followers_count")
            or entry.get("follower_count")
            or entry.get("subscribers")
        )
        if followers > 0:
            competitor.followers_count = followers

        media_count = _coerce_int(
            entry.get("posts_count") or entry.get("media_count") or entry.get("post_count")
        )
        if media_count > 0:
            competitor.media_count = media_count

        engagement_rank = engagement_rate_to_rank(
            entry.get("engagement_rate") or entry.get("avg_engagement")
        )
        if engagement_rank >= 0:
            competitor.engagement_rank = engagement_rank

    picture = (
        entry.get("profile_image_link")
        or entry.get("profile_picture_url")
        or entry.get("profile_pic_url")
    )
    if not picture and not is_profile_row:
        picture = entry.get("thumbnail_url")
    if picture and is_profile_row:
        competitor.profile_picture_url = picture
        await prefetch_competitor_avatar(competitor.id, picture)

    display_name = entry.get("full_name") or entry.get("display_name") or entry.get("profile_name")
    if display_name and (not competitor.display_name or competitor.display_name == competitor.handle):
        competitor.display_name = display_name

    db.add(competitor)


async def _save_competitor_media(db: AsyncSession, competitor_id: UUID, user_id: UUID, results: list):
    """
    Saves the list of videos for a specific competitor.
    """
    if not results:
        return

    competitor = await db.get(CompetitorAccount, competitor_id)
    if not competitor:
        logger.info("Skipping media save — competitor %s was removed", competitor_id)
        return

    for raw in results:
        await _enrich_competitor_from_provider_entry(db, competitor_id, raw)

    entries = normalize_competitor_media(results)
    existing = (
        await db.exec(select(CompetitorMedia).where(CompetitorMedia.competitor_account_id == competitor_id))
    ).all()
    by_key = {}
    for row in existing:
        for key in (row.provider_media_id, row.permalink):
            if key:
                by_key[key] = row

    for entry in entries[:MAX_VIDEOS_PER_COMPETITOR]:
        provider_id = str(entry.get("id") or "") or None
        permalink = entry.get("permalink", "")
        provider_transcript = (entry.get("transcript_text") or entry.get("transcript") or "").strip()
        audio_url = entry.get("audio_url") or entry.get("media_url") or ""
        published_at = entry.get("published_at") or utc_now()

        media = by_key.get(provider_id) or by_key.get(permalink)
        if media:
            # Re-scrape: refresh metrics and URLs (CDN links expire) but keep transcript + analyses.
            media.caption = entry.get("caption", "") or media.caption
            media.metrics = entry.get("metrics", {}) or media.metrics
            media.thumbnail_url = entry.get("thumbnail_url") or media.thumbnail_url
            media.audio_url = audio_url or media.audio_url
            media.published_at = published_at
            if provider_id and not media.provider_media_id:
                media.provider_media_id = provider_id
            if provider_transcript and media.transcript_source in ("", "none", "simulation"):
                media.transcript_text = provider_transcript
                media.transcript_source = "provider"
            db.add(media)
            continue

        media = CompetitorMedia(
            user_id=user_id,
            competitor_account_id=competitor_id,
            provider_media_id=provider_id,
            media_type=entry.get("media_type", "VIDEO"),
            caption=entry.get("caption", ""),
            hashtags={"names": entry.get("hashtags", [])},
            permalink=permalink,
            thumbnail_url=entry.get("thumbnail_url", ""),
            audio_url=audio_url,
            transcript_text=provider_transcript,
            transcript_source="provider" if provider_transcript else "none",
            metrics=entry.get("metrics", {}),
            published_at=published_at,
        )
        db.add(media)
        for key in (provider_id, permalink):
            if key:
                by_key[key] = media
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.warning("Could not save media for competitor %s: %s", competitor_id, e)


async def _refresh_competitor_profiles(
    db: AsyncSession,
    competitor_ids: list[UUID],
    *,
    force: bool = False,
) -> None:
    """Fetch Bright Data profile snapshots to backfill or refresh follower counts."""
    snapshots: list[tuple[UUID, str]] = []
    for comp_id in competitor_ids:
        competitor = await db.get(CompetitorAccount, comp_id)
        if not competitor:
            continue
        if not force and competitor.followers_count > 0:
            continue
        snapshot_id = await social_data_client.fetch_profile_snapshot(competitor.handle)
        if snapshot_id:
            snapshots.append((comp_id, snapshot_id))

    for attempt, delay in enumerate(PROFILE_SNAPSHOT_POLL_DELAYS_SECONDS):
        if delay and attempt > 0:
            await asyncio.sleep(delay)
        remaining: list[tuple[UUID, str]] = []
        for comp_id, snapshot_id in snapshots:
            competitor = await db.get(CompetitorAccount, comp_id)
            if not competitor:
                continue
            raw = await social_data_client.get_snapshot_results(snapshot_id)
            if raw:
                from app.core.client.social_data import normalize_competitor_profiles

                profiles = normalize_competitor_profiles(raw)
                # Only trust a row that belongs to this handle; a lone row is the by-URL scrape result.
                wanted = competitor.handle.lower()
                profile = next(
                    (p for p in profiles if (p.get("handle") or "").lower() == wanted),
                    profiles[0] if len(profiles) == 1 else None,
                )
                if profile:
                    await _enrich_competitor_from_provider_entry(db, comp_id, profile)
                    competitor.last_synced_at = utc_now()
                    db.add(competitor)
            else:
                remaining.append((comp_id, snapshot_id))
        snapshots = remaining
        if not snapshots:
            break

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.warning("Could not refresh competitor profiles: %s", e)
