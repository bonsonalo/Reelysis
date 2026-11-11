"""Shared job bookkeeping: progress heartbeats and stale-job reconciliation."""

from __future__ import annotations

from datetime import datetime
from typing import Callable
from uuid import UUID

from sqlmodel import Session, update
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.logger import logger
from app.model.analysis_job import AnalysisJob
from app.utils.time import utc_now

ACTIVE_STATUSES = ("queued", "running")
TERMINAL_STATUSES = ("succeeded", "failed")

# A queued job may legitimately wait behind long tasks on the same queue (e.g. a report).
STALE_QUEUED_SECONDS = 30 * 60
# Running jobs heartbeat on every progress update; the longest silent stretch is one external
# call plus Gemini throttling (well under this). Celery's hard limit is 1 hour per task.
STALE_RUNNING_SECONDS = 15 * 60


def set_progress(job: AnalysisJob, progress: int) -> None:
    """Update progress and heartbeat (updated_at) together; caller commits."""
    job.progress = max(0, min(100, int(progress)))
    job.updated_at = utc_now()


def mark_running(job: AnalysisJob, progress: int = 0) -> None:
    job.status = "running"
    job.started_at = utc_now()
    set_progress(job, progress)


def mark_succeeded(job: AnalysisJob) -> None:
    job.status = "succeeded"
    job.completed_at = utc_now()
    set_progress(job, 100)


def mark_failed(job: AnalysisJob, message: str) -> None:
    job.status = "failed"
    job.error_message = (message or "Unknown error")[:2000]
    job.completed_at = utc_now()
    job.updated_at = utc_now()


def heartbeat_sync(job_id: UUID | str) -> None:
    """Bump updated_at from a worker thread that does not hold the job's session."""
    from app.core.database import sync_engine

    try:
        with Session(sync_engine) as db:
            db.exec(
                update(AnalysisJob)
                .where(AnalysisJob.id == UUID(str(job_id)))
                .values(updated_at=utc_now())
            )
            db.commit()
    except Exception as e:
        logger.warning("Job heartbeat failed for %s: %s", job_id, e)


def _seconds_since(ts: datetime | None, now: datetime) -> float:
    if ts is None or ts.year <= 1971:
        return float("inf")
    return max(0.0, (now - ts.replace(tzinfo=None)).total_seconds())


def last_heartbeat_age(job: AnalysisJob, now: datetime | None = None) -> float:
    now = now or utc_now()
    return min(
        _seconds_since(job.updated_at, now),
        _seconds_since(job.started_at, now),
        _seconds_since(job.created_at, now),
    )


def job_should_start(job: AnalysisJob | None) -> bool:
    """Workers only pick up queued jobs; duplicates or reconciler-failed jobs are skipped."""
    if not job:
        return False
    if job.status != "queued":
        logger.info("Skipping job %s (status=%s)", job.id, job.status)
        return False
    return True


async def reconcile_job(
    job: AnalysisJob,
    db: AsyncSession,
    *,
    queued_message: str,
    running_message: str,
    queued_seconds: float = STALE_QUEUED_SECONDS,
    running_seconds: float = STALE_RUNNING_SECONDS,
    redispatch: Callable[[AnalysisJob], None] | None = None,
) -> AnalysisJob:
    """Fail jobs whose worker is gone; optionally re-send a queued task that seems lost."""
    if job.status not in ACTIVE_STATUSES:
        return job

    now = utc_now()
    if job.status == "queued":
        age = _seconds_since(job.created_at, now)
        if age >= queued_seconds:
            logger.warning("Failing stale queued %s job %s (age %.0fs)", job.job_type, job.id, age)
            mark_failed(job, queued_message)
            db.add(job)
            await db.commit()
            await db.refresh(job)
            return job
        # Re-send at most 3 times, at least 2 minutes apart, for messages lost by a broker restart.
        if redispatch and age >= 120 and job.retry_count < 3 and _seconds_since(job.updated_at, now) >= 120:
            job.retry_count += 1
            job.updated_at = now
            db.add(job)
            await db.commit()
            await db.refresh(job)
            logger.warning("Re-dispatching queued %s job %s (attempt %s)", job.job_type, job.id, job.retry_count)
            redispatch(job)
        return job

    age = last_heartbeat_age(job, now)
    if age >= running_seconds:
        logger.warning("Failing stale running %s job %s (no heartbeat for %.0fs)", job.job_type, job.id, age)
        mark_failed(job, running_message)
        db.add(job)
        await db.commit()
        await db.refresh(job)
    return job


async def reconcile_generic_job(job: AnalysisJob, db: AsyncSession) -> AnalysisJob:
    return await reconcile_job(
        job,
        db,
        queued_message="Job timed out before starting. Please try again.",
        running_message="Job was interrupted. Please try again.",
    )
