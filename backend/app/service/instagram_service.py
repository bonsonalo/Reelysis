import asyncio
import redis
from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from app.core.config import settings
from app.core.client.meta import InstagramAuthError, meta_client
from app.core.redis import redis_client
from app.model.instagram_accounts import InstagramAccount
from app.core.logger import logger
from app.model.external_token import ExternalToken
from app.model.analysis_job import AnalysisJob
from app.model.media_items import MediaItem
from app.model.media_metrics import MediaMetric
from app.core.celery_app import celery_app
from app.core.database import sync_engine
from app.service.ai_service import detect_niche_service_sync
from app.service.competitor_service import discover_competitors_service
from app.utils.caption import parse_hashtags_from_caption, top_frequent_hashtags
from app.service.job_utils import (
    job_should_start,
    mark_failed,
    mark_running,
    mark_succeeded,
    reconcile_job,
    set_progress,
)

from cryptography.fernet import Fernet
from sqlmodel import Session, select, desc, delete
from sqlmodel.ext.asyncio.session import AsyncSession

from app.model.recommendations import Recommendation
from app.model.account_report import AccountReport
from app.model.video_analysis import VideoAnalysis
from app.model.competitor_media import CompetitorMedia
from app.model.competitor_accounts import CompetitorAccount

fernet = Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())

# Reels/videos only: Reelysis analyses short-form video, not photos or carousels.
SYNCABLE_MEDIA_TYPES = {"VIDEO", "REELS"}


from app.utils.time import utc_now


def _utc_now() -> datetime:
    return utc_now()


def _dispatch_sync_celery(job_id: UUID, user_id: UUID) -> None:
    logger.info("Dispatching instagram sync celery task for job %s user %s", job_id, user_id)
    celery_app.send_task(
        "app.service.instagram_service.sync_instagram_data_task",
        args=[str(job_id), str(user_id)],
    )


async def _has_newer_terminal_sync_job(job: AnalysisJob, db: AsyncSession) -> bool:
    stmt = (
        select(AnalysisJob)
        .where(
            AnalysisJob.user_id == job.user_id,
            AnalysisJob.job_type == "instagram_sync",
            AnalysisJob.id != job.id,
            AnalysisJob.status.in_(["succeeded", "failed"]),
            AnalysisJob.created_at > job.created_at,
        )
        .limit(1)
    )
    return (await db.exec(stmt)).first() is not None


async def reconcile_instagram_sync_job(job: AnalysisJob, db: AsyncSession) -> AnalysisJob:
    """Recover or fail stale instagram_sync jobs during trigger/poll."""
    if job.job_type != "instagram_sync" or job.status not in ("queued", "running"):
        return job

    if job.status == "queued" and await _has_newer_terminal_sync_job(job, db):
        logger.warning("Failing superseded queued sync job %s", job.id)
        mark_failed(job, "Sync timed out before starting. Please try again.")
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    return await reconcile_job(
        job,
        db,
        queued_message="Sync timed out before starting. Please try again.",
        running_message="Sync was interrupted. Please try again.",
        redispatch=lambda j: _dispatch_sync_celery(j.id, j.user_id),
    )


def _parse_insight_metrics(insights: dict) -> dict:
    metric_data: dict = {}
    for metric in insights.get("data", []):
        name = metric.get("name")
        if not name:
            continue

        total_value = metric.get("total_value")
        if isinstance(total_value, dict) and total_value.get("value") is not None:
            metric_data[name] = total_value.get("value", 0)
            continue

        values = metric.get("values") or []
        if values:
            metric_data[name] = values[0].get("value", 0)
    return metric_data


def _parse_media_timestamp(item: dict) -> datetime:
    timestamp = item.get("timestamp")
    if not timestamp:
        return utc_now()
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00")).replace(tzinfo=None)

async def get_oauth_url_service(user_id: UUID):
    try:
        oauth_data = meta_client.get_oauth_url()
        
        if not meta_client.app_id or meta_client.app_id == "None":
             logger.error("Meta App ID is missing or invalid")
             raise ValueError("Meta API configuration is missing")

        await redis_client.setex(f"oauth_state:{oauth_data['state']}", 600, str(user_id))
        return oauth_data['url']
    except redis.exceptions.ConnectionError as e:
        logger.error(f"Redis connection failed: {e}")
        raise ValueError("Temporary storage connection failed")
    except Exception as e:
        logger.error(f"Error generating OAuth URL: {e}")
        raise ValueError(str(e))

class OAuthStateError(ValueError):
    """The OAuth state is unknown or expired (stale tab, replay, or forged callback)."""


async def handle_oauth_callback_service(code: str, state: str, db: AsyncSession):
    user_id_raw = await redis_client.get(f"oauth_state:{state}")
    if not user_id_raw:
        raise OAuthStateError("Invalid or expired state parameter")
    try:
        logger.info("Handling Instagram OAuth callback")
        
        user_id = UUID(user_id_raw.decode() if isinstance(user_id_raw, bytes) else user_id_raw)
        await redis_client.delete(f"oauth_state:{state}")
        token_data = await meta_client.exchange_code_for_access_token(code)
        short_lived_token = token_data.get("access_token")
        if not short_lived_token:
            raise ValueError("Failed to obtain access token")
            
        long_lived_token_data = await meta_client.exchange_for_long_lived_token(short_lived_token)
        long_lived_token = long_lived_token_data.get("access_token")
        if not long_lived_token:
            raise ValueError("Failed to obtain long-lived access token")
            
        encrypted_token = fernet.encrypt(long_lived_token.encode()).decode()
        instagram_account_data = await meta_client.get_instagram_account(long_lived_token)      
        
        existing_account_stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
        existing_account = (await db.exec(existing_account_stmt)).first()
        
        if existing_account:
            existing_account.instagram_user_id = instagram_account_data["id"]
            existing_account.username = instagram_account_data["username"]
            existing_account.account_type = instagram_account_data["account_type"]
            existing_account.profile_picture_url = instagram_account_data.get("profile_picture_url")
            existing_account.biography = instagram_account_data.get("biography")
            existing_account.followers_count = instagram_account_data.get("followers_count", 0)
            existing_account.media_count = instagram_account_data.get("media_count", 0)
            db.add(existing_account)
        else:
            instagram_account = InstagramAccount(
                instagram_user_id=instagram_account_data["id"],
                username=instagram_account_data["username"],
                account_type=instagram_account_data["account_type"],
                profile_picture_url=instagram_account_data.get("profile_picture_url"),
                biography=instagram_account_data.get("biography"),
                followers_count=instagram_account_data.get("followers_count", 0),
                media_count=instagram_account_data.get("media_count", 0),
                user_id=user_id,
            )  
            db.add(instagram_account)
            
        existing_token_stmt = select(ExternalToken).where(ExternalToken.user_id == user_id)
        existing_token = (await db.exec(existing_token_stmt)).first()
        
        expires_at = utc_now() + timedelta(seconds=long_lived_token_data.get("expires_in", 5184000))
        
        if existing_token:
            existing_token.encrypted_access_token = encrypted_token
            existing_token.expires_at = expires_at
            db.add(existing_token)
        else:
            external_token = ExternalToken(
                user_id=user_id,
                encrypted_access_token=encrypted_token,
                expires_at=expires_at,
                scopes=["instagram_business_basic", "instagram_business_manage_insights"]
            )
            db.add(external_token)
            
        await db.commit()
        return True
    except Exception as e:
        logger.error(f"Error handling OAuth callback: {e}")
        raise ValueError(f"Failed to handle OAuth callback: {str(e)}")

async def get_connected_accounts_service(user_id: UUID, db: AsyncSession):
    accounts = (await db.exec(select(InstagramAccount).where(InstagramAccount.user_id == user_id))).all()
    token = (await db.exec(select(ExternalToken).where(ExternalToken.user_id == user_id))).first()
    expires_at = token.expires_at if token else None
    needs_reconnect = expires_at is None or expires_at <= utc_now()
    return [
        {
            **account.model_dump(),
            "token_expires_at": expires_at,
            "needs_reconnect": needs_reconnect,
        }
        for account in accounts
    ]


async def _get_instagram_account(user_id: UUID, db: AsyncSession) -> InstagramAccount | None:
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
    return (await db.exec(stmt)).first()


async def purge_user_instagram_data_service(user_id: UUID, db: AsyncSession):
    """Permanently delete all Instagram-derived data for a user."""
    await db.exec(delete(Recommendation).where(Recommendation.user_id == user_id))
    await db.exec(delete(AccountReport).where(AccountReport.user_id == user_id))
    await db.exec(delete(VideoAnalysis).where(VideoAnalysis.user_id == user_id))
    await db.exec(delete(MediaItem).where(MediaItem.user_id == user_id))
    await db.exec(delete(CompetitorMedia).where(CompetitorMedia.user_id == user_id))
    await db.exec(delete(CompetitorAccount).where(CompetitorAccount.user_id == user_id))
    await db.exec(delete(AnalysisJob).where(AnalysisJob.user_id == user_id))

    token_stmt = select(ExternalToken).where(ExternalToken.user_id == user_id)
    token = (await db.exec(token_stmt)).first()
    if token:
        await db.delete(token)

    account = await _get_instagram_account(user_id, db)
    if account:
        await db.delete(account)

    await db.commit()
    return True


async def disconnect_instagram_service(user_id: UUID, db: AsyncSession):
    """Disconnect Instagram and permanently delete all synced data for this user."""
    account = await _get_instagram_account(user_id, db)
    if not account:
        raise ValueError("No Instagram account connected.")
    await purge_user_instagram_data_service(user_id, db)
    return True


async def _fail_superseded_queued_sync_jobs(user_id: UUID, db: AsyncSession) -> int:
    """Fail queued sync jobs that were overtaken by a newer completed job."""
    latest_terminal_stmt = (
        select(AnalysisJob)
        .where(
            AnalysisJob.user_id == user_id,
            AnalysisJob.job_type == "instagram_sync",
            AnalysisJob.status.in_(["succeeded", "failed"]),
        )
        .order_by(desc(AnalysisJob.created_at))
        .limit(1)
    )
    latest_terminal = (await db.exec(latest_terminal_stmt)).first()
    if not latest_terminal:
        return 0

    stale_stmt = select(AnalysisJob).where(
        AnalysisJob.user_id == user_id,
        AnalysisJob.job_type == "instagram_sync",
        AnalysisJob.status == "queued",
        AnalysisJob.created_at < latest_terminal.created_at,
    )
    stale_jobs = (await db.exec(stale_stmt)).all()
    if not stale_jobs:
        return 0

    now = _utc_now()
    for stale_job in stale_jobs:
        stale_job.status = "failed"
        stale_job.error_message = "Sync timed out before starting. Please try again."
        stale_job.completed_at = now
        db.add(stale_job)

    await db.commit()
    logger.warning(
        "Failed %s superseded queued sync jobs for user %s",
        len(stale_jobs),
        user_id,
    )
    return len(stale_jobs)


async def _require_active_instagram_account(user_id: UUID, db: AsyncSession) -> InstagramAccount:
    account = await _get_instagram_account(user_id, db)
    if not account:
        raise ValueError("No Instagram account connected.")
    return account


async def trigger_instagram_sync_service(user_id: UUID, db: AsyncSession):
    account = await _require_active_instagram_account(user_id, db)

    await _fail_superseded_queued_sync_jobs(user_id, db)

    latest_stmt = (
        select(AnalysisJob)
        .where(
            AnalysisJob.user_id == user_id,
            AnalysisJob.job_type == "instagram_sync",
        )
        .order_by(desc(AnalysisJob.created_at))
        .limit(1)
    )
    latest_job = (await db.exec(latest_stmt)).first()
    if latest_job and latest_job.status in ("queued", "running"):
        latest_job = await reconcile_instagram_sync_job(latest_job, db)
        if latest_job.status in ("queued", "running"):
            return latest_job

    new_job = AnalysisJob(
        user_id=user_id,
        job_type="instagram_sync",
        status="queued",
        progress=0
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    _dispatch_sync_celery(new_job.id, user_id)

    return new_job

async def confirm_instagram_niche_service(user_id: UUID, niche: str, db: AsyncSession):
    """
    Saves the user-confirmed niche to the database and triggers competitor discovery.
    """
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
    account = (await db.exec(stmt)).first()
    if not account:
        raise ValueError("Instagram account not found.")

    clean_niche = niche.strip()
    if not clean_niche:
        raise ValueError("Niche cannot be empty.")

    account.niche_confirmed = clean_niche
    account.niche_detected = clean_niche
    db.add(account)
    await db.commit()
    await db.refresh(account)

    await discover_competitors_service(user_id, clean_niche, db)

    return account


async def update_instagram_niche_service(
    user_id: UUID,
    niche: str,
    db: AsyncSession,
    trigger_discovery: bool = False,
):
    """Update confirmed niche from settings without forcing onboarding discovery."""
    account = await _require_active_instagram_account(user_id, db)

    clean_niche = niche.strip()
    if not clean_niche:
        raise ValueError("Niche cannot be empty.")

    account.niche_confirmed = clean_niche
    account.niche_detected = clean_niche
    db.add(account)
    await db.commit()
    await db.refresh(account)

    if trigger_discovery:
        from app.service.competitor_service import DISCOVERY_MODE_REFRESH

        await discover_competitors_service(
            user_id,
            clean_niche,
            db,
            mode=DISCOVERY_MODE_REFRESH,
        )

    return account


async def detect_instagram_niche_service(user_id: UUID, db: AsyncSession):
    """Re-run AI niche detection from the user's synced Instagram content."""
    account = await _require_active_instagram_account(user_id, db)
    if not account.last_synced_at:
        raise ValueError("Sync your Instagram account first so we can analyze your content.")

    media_stmt = select(MediaItem).where(MediaItem.user_id == user_id).limit(25)
    media_items = (await db.exec(media_stmt)).all()
    captions = [item.caption for item in media_items if item.caption]
    hashtags = top_frequent_hashtags(captions)

    detected = await asyncio.to_thread(
        detect_niche_service_sync,
        account.biography or "",
        captions,
        hashtags,
    )
    if not detected:
        raise ValueError(
            "AI niche detection failed (Gemini quota or API error). "
            "Set your niche manually or try again later."
        )
    account.niche_detected = detected
    db.add(account)
    await db.commit()
    await db.refresh(account)

    return {
        "niche_detected": detected,
        "niche_confirmed": account.niche_confirmed,
        "biography": account.biography,
        "caption_count": len(captions),
    }

def enqueue_sync_job_sync(db: Session, user_id: UUID) -> AnalysisJob | None:
    """Queue a sync from a worker context (scheduler). Skips users with a sync already in flight."""
    active = db.exec(
        select(AnalysisJob).where(
            AnalysisJob.user_id == user_id,
            AnalysisJob.job_type == "instagram_sync",
            AnalysisJob.status.in_(["queued", "running"]),
        )
    ).first()
    if active:
        return None
    job = AnalysisJob(user_id=user_id, job_type="instagram_sync", status="queued", progress=0)
    db.add(job)
    db.commit()
    db.refresh(job)
    _dispatch_sync_celery(job.id, user_id)
    return job


def refresh_token_if_expiring(db: Session, token_record: ExternalToken) -> str:
    """Return a usable decrypted token, extending it first when it is close to expiry."""
    decrypted = fernet.decrypt(token_record.encrypted_access_token.encode()).decode()
    if token_record.expires_at <= utc_now():
        raise InstagramAuthError("Instagram access expired. Please reconnect your Instagram account.")

    refresh_window = timedelta(days=settings.IG_TOKEN_REFRESH_DAYS_BEFORE_EXPIRY)
    if token_record.expires_at - utc_now() > refresh_window:
        return decrypted
    try:
        data = asyncio.run(meta_client.refresh_long_lived_token(decrypted))
    except InstagramAuthError:
        raise
    except Exception as e:
        logger.warning("Instagram token refresh failed for user %s: %s", token_record.user_id, e)
        return decrypted

    new_token = data.get("access_token")
    if not new_token:
        return decrypted
    token_record.encrypted_access_token = fernet.encrypt(new_token.encode()).decode()
    token_record.expires_at = utc_now() + timedelta(seconds=int(data.get("expires_in", 5184000)))
    db.add(token_record)
    db.commit()
    logger.info("Refreshed Instagram token for user %s", token_record.user_id)
    return new_token


def mark_token_invalid(db: Session, user_id: UUID) -> None:
    """Expire the stored token so the UI shows a reconnect prompt."""
    token = db.exec(select(ExternalToken).where(ExternalToken.user_id == user_id)).first()
    if token and token.expires_at > utc_now():
        token.expires_at = utc_now()
        db.add(token)
        db.commit()


def _is_syncable(item: dict) -> bool:
    media_type = (item.get("media_type") or "").upper()
    product_type = (item.get("media_product_type") or "").upper()
    return media_type == "VIDEO" or product_type in SYNCABLE_MEDIA_TYPES


@celery_app.task(name="app.service.instagram_service.sync_instagram_data_task")
def sync_instagram_data_task(job_id: str, user_id: str):
    """
    Background task to sync Instagram data using synchronous database session.
    """
    return _sync_instagram_data_internal(job_id, user_id)


def _sync_instagram_data_internal(job_id: str, user_id: str):
    user_uuid = UUID(user_id)
    with Session(sync_engine) as db:
        job = None
        try:
            job = db.get(AnalysisJob, UUID(job_id))
            if not job_should_start(job):
                return
            mark_running(job)
            db.commit()

            token_record = db.exec(select(ExternalToken).where(ExternalToken.user_id == user_uuid)).first()
            if not token_record:
                raise ValueError("Instagram is not connected. Please connect your account again.")

            account = db.exec(select(InstagramAccount).where(InstagramAccount.user_id == user_uuid)).first()
            if not account:
                raise ValueError("Instagram account not found")
            ig_user_id = account.instagram_user_id

            decrypted_token = refresh_token_if_expiring(db, token_record)

            profile_data = asyncio.run(meta_client.get_instagram_account(decrypted_token))
            account.biography = profile_data.get("biography") or account.biography
            account.followers_count = profile_data.get("followers_count", account.followers_count)
            account.media_count = profile_data.get("media_count", account.media_count)
            account.profile_picture_url = profile_data.get("profile_picture_url") or account.profile_picture_url
            db.add(account)
            set_progress(job, 5)
            db.commit()

            media_data = asyncio.run(
                meta_client.get_user_media(ig_user_id, decrypted_token, max_items=settings.SYNC_MAX_MEDIA)
            )
            items = [item for item in media_data.get("data", []) if _is_syncable(item)]
            total_items = len(items)

            # Earlier versions imported photos/carousels too; drop them so totals reflect Reels only.
            db.exec(
                delete(MediaItem).where(
                    MediaItem.user_id == user_uuid,
                    MediaItem.media_type.not_in(["VIDEO", "REEL", "REELS"]),
                )
            )
            db.commit()

            all_captions: List[str] = []

            for index, item in enumerate(items):
                insights = asyncio.run(meta_client.get_media_insights(item["id"], decrypted_token))

                existing_media_stmt = select(MediaItem).where(
                    MediaItem.user_id == user_uuid,
                    MediaItem.external_media_id == item["id"],
                )
                media_item = db.exec(existing_media_stmt).first()

                caption = item.get("caption", "") or ""
                all_captions.append(caption)
                hashtag_payload = {"names": parse_hashtags_from_caption(caption)}
                thumbnail_url = item.get("thumbnail_url") or item.get("media_url") or ""
                audio_url = item.get("media_url") or ""
                published_at = _parse_media_timestamp(item)

                if not media_item:
                    media_item = MediaItem(
                        user_id=user_uuid,
                        external_media_id=item["id"],
                        media_type=item["media_type"],
                        caption=caption,
                        hashtag=hashtag_payload,
                        permalink=item.get("permalink", ""),
                        thumbnail_url=thumbnail_url,
                        audio_url=audio_url,
                        published_at=published_at,
                    )
                    db.add(media_item)
                    db.commit()
                    db.refresh(media_item)
                else:
                    media_item.caption = caption
                    media_item.hashtag = hashtag_payload
                    media_item.media_type = item["media_type"]
                    media_item.permalink = item.get("permalink", media_item.permalink)
                    media_item.thumbnail_url = thumbnail_url or media_item.thumbnail_url
                    if audio_url:
                        media_item.audio_url = audio_url
                    media_item.published_at = published_at
                    db.add(media_item)
                    db.commit()

                metric_data = _parse_insight_metrics(insights)
                if not metric_data:
                    logger.warning(
                        "No insight metrics parsed for media %s. Raw response keys: %s",
                        item.get("id"),
                        list(insights.keys()) if isinstance(insights, dict) else type(insights),
                    )

                media_metric = MediaMetric(
                    media_item_id=media_item.id,
                    view=int(metric_data.get("views", 0) or 0),
                    reach=int(metric_data.get("reach", 0) or 0),
                    likes=int(metric_data.get("likes", 0) or 0),
                    comments=str(int(metric_data.get("comments", 0) or 0)),
                    saves=int(metric_data.get("saved", 0) or 0),
                    shares=int(metric_data.get("shares", 0) or 0),
                    total_interactions=int(metric_data.get("total_interactions", 0) or 0),
                    raw_metrics=metric_data,
                    captured_at=utc_now(),
                )
                db.add(media_metric)

                set_progress(job, 5 + int(((index + 1) / total_items) * 90))
                db.commit()

            set_progress(job, 95)
            db.commit()

            top_hashtags = top_frequent_hashtags(all_captions)
            if account.niche_confirmed:
                detected_niche = account.niche_confirmed
                logger.info(
                    "Skipping niche detection for user %s (confirmed: %s)",
                    user_id,
                    detected_niche,
                )
            else:
                logger.info("Starting niche detection for user %s", user_id)
                detected_niche = detect_niche_service_sync(
                    account.biography or "",
                    all_captions,
                    top_hashtags,
                )
                if detected_niche:
                    account.niche_detected = detected_niche
                elif not account.niche_detected:
                    account.niche_detected = "Uncategorized"
                    detected_niche = account.niche_detected
                else:
                    detected_niche = account.niche_detected
            account.last_synced_at = utc_now()
            account.followers_count = profile_data.get("followers_count", account.followers_count)
            account.media_count = profile_data.get("media_count", account.media_count)

            mark_succeeded(job)
            db.commit()
            db.refresh(account)

            logger.info(f"Sync completed successfully for user {user_id}, niche detected: {detected_niche}, last_synced_at: {account.last_synced_at}")

            # Trigger transcription only; Gemini video analysis runs during report generation.
            from app.service.transcript_service import enqueue_transcription_for_user

            enqueue_transcription_for_user(db, user_uuid)
            logger.info(f"Transcription triggered for user {user_id}")

        except Exception as e:
            logger.exception(f"Error in sync task: {e}")
            db.rollback()
            if isinstance(e, InstagramAuthError):
                mark_token_invalid(db, user_uuid)
            if job:
                job = db.get(AnalysisJob, UUID(job_id))
                if job:
                    message = str(e) or repr(e)
                    if not isinstance(e, (InstagramAuthError, ValueError)):
                        message = f"Sync failed: {message}"[:500]
                    mark_failed(job, message)
                    db.commit()
