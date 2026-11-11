"""Celery beat tasks: daily Instagram sync and long-lived token refresh."""

from datetime import timedelta

from sqlmodel import Session, select

from app.core.celery_app import celery_app
from app.core.client.meta import InstagramAuthError
from app.core.config import settings
from app.core.database import sync_engine
from app.core.logger import logger
from app.model.external_token import ExternalToken
from app.model.instagram_accounts import InstagramAccount
from app.service.instagram_service import (
    enqueue_sync_job_sync,
    mark_token_invalid,
    refresh_token_if_expiring,
)
from app.utils.time import utc_now

# Spread load: the task runs hourly, so at most this many syncs are queued per run.
MAX_SYNCS_PER_RUN = 25


@celery_app.task(name="app.service.scheduled_service.enqueue_due_syncs_task")
def enqueue_due_syncs_task() -> int:
    """Queue a sync for every connected account whose last sync is older than the interval."""
    if not settings.AUTO_SYNC_ENABLED:
        return 0

    now = utc_now()
    cutoff = now - timedelta(hours=settings.AUTO_SYNC_INTERVAL_HOURS)
    queued = 0
    with Session(sync_engine) as db:
        stmt = (
            select(InstagramAccount)
            .join(ExternalToken, ExternalToken.user_id == InstagramAccount.user_id)
            .where(
                InstagramAccount.last_synced_at.is_not(None),
                InstagramAccount.last_synced_at < cutoff,
                ExternalToken.expires_at > now,
            )
            .order_by(InstagramAccount.last_synced_at)
            .limit(MAX_SYNCS_PER_RUN)
        )
        for account in db.exec(stmt).all():
            if enqueue_sync_job_sync(db, account.user_id):
                queued += 1
    logger.info("Scheduled %d automatic Instagram sync(s)", queued)
    return queued


@celery_app.task(name="app.service.scheduled_service.refresh_expiring_tokens_task")
def refresh_expiring_tokens_task() -> int:
    """Extend long-lived Instagram tokens before they expire (they last ~60 days)."""
    now = utc_now()
    window_end = now + timedelta(days=settings.IG_TOKEN_REFRESH_DAYS_BEFORE_EXPIRY)
    refreshed = 0
    with Session(sync_engine) as db:
        tokens = db.exec(
            select(ExternalToken).where(
                ExternalToken.expires_at > now,
                ExternalToken.expires_at <= window_end,
            )
        ).all()
        for token in tokens:
            previous_expiry = token.expires_at
            try:
                refresh_token_if_expiring(db, token)
            except InstagramAuthError:
                mark_token_invalid(db, token.user_id)
                continue
            except Exception as e:
                logger.warning("Token refresh failed for user %s: %s", token.user_id, e)
                continue
            if token.expires_at > previous_expiry:
                refreshed += 1
    logger.info("Refreshed %d Instagram token(s)", refreshed)
    return refreshed
