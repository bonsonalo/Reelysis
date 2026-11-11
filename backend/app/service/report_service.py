import asyncio
import json
from uuid import UUID
from sqlmodel import select, col, desc
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.utils.time import utc_now

from app.core.database import AsyncSessionLocal, run_async_task
from app.core.logger import logger
from app.core.celery_app import celery_app
from app.model.video_analysis import VideoAnalysis, MediaSource
from app.model.analysis_job import AnalysisJob
from app.model.account_report import AccountReport
from app.model.recommendations import Recommendation
from app.service.ai_service import generate_strategic_report_service, GeminiQuotaExceededError, remaining_gemini_budget
from app.core.config import settings
from app.service.competitor_service import prepare_competitor_data_for_report
from app.service.transcript_service import run_transcription_sync
from app.service.video_analysis_service import run_video_analysis_sync
from app.service.job_utils import (
    heartbeat_sync,
    job_should_start,
    mark_failed,
    mark_running,
    mark_succeeded,
    reconcile_job,
    set_progress,
)

# Thresholds for a "high" hook score on the 0-100 scale used everywhere.
WINNING_HOOK_SCORE = 80
STRONG_HOOK_SCORE = 70


async def reconcile_report_generation_job(job: AnalysisJob, db: AsyncSession) -> AnalysisJob:
    """Fail report jobs whose worker stopped heartbeating (e.g. restart mid-task)."""
    if job.job_type != "report_generation":
        return job
    return await reconcile_job(
        job,
        db,
        queued_message="Report timed out before starting. Wake the worker and try again.",
        running_message="Report generation was interrupted. Please try again.",
    )


async def trigger_report_generation_service(user_id: UUID, db: AsyncSession):
    """
    Triggers the generation of a new strategic growth report.
    Returns an existing in-flight job if one is already running.
    """
    active_stmt = (
        select(AnalysisJob)
        .where(
            AnalysisJob.user_id == user_id,
            AnalysisJob.job_type == "report_generation",
            AnalysisJob.status.in_(("queued", "running")),
        )
        .order_by(desc(AnalysisJob.created_at))
        .limit(1)
    )
    active = (await db.exec(active_stmt)).first()
    if active:
        active = await reconcile_report_generation_job(active, db)
        if active.status in ("queued", "running"):
            logger.info("Report generation already in progress for user %s (job %s)", user_id, active.id)
            return active

    job = AnalysisJob(
        user_id=user_id,
        job_type="report_generation",
        status="queued",
        progress=0
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    celery_app.send_task(
        "app.service.report_service.generate_report_task",
        args=[str(job.id), str(user_id)]
    )
    return job

@celery_app.task(name="app.service.report_service.generate_report_task")
def generate_report_task(job_id: str, user_id: str):
    return run_async_task(_generate_report_internal, job_id, user_id)

async def _generate_report_internal(job_id: str, user_id: str):
    async with AsyncSessionLocal() as db:
        job: AnalysisJob | None = None
        try:
            job = await db.get(AnalysisJob, UUID(job_id))
            if not job_should_start(job):
                return

            mark_running(job, progress=2)
            await db.commit()

            user_uuid = UUID(user_id)
            heartbeat = lambda: heartbeat_sync(job_id)  # noqa: E731 — called from worker threads

            # 1. Refresh competitor profiles + reels when stale (batch Bright Data).
            await prepare_competitor_data_for_report(db, user_uuid, job)

            set_progress(job, max(job.progress, 58))
            await db.commit()

            # 2. Transcribe + analyze any pending media before building the brief.
            await asyncio.to_thread(run_transcription_sync, user_uuid, heartbeat)
            set_progress(job, 70)
            await db.commit()

            video_budget = remaining_gemini_budget(reserve=settings.GEMINI_REPORT_RESERVE)
            if video_budget <= 0 and not await _has_video_analysis(db, user_uuid):
                raise GeminiQuotaExceededError(
                    "No Gemini budget left today for video analysis and no prior analyses exist. "
                    "Try again tomorrow, or run competitor discovery on a different day."
                )

            await asyncio.to_thread(run_video_analysis_sync, user_uuid, video_budget, heartbeat)
            set_progress(job, 82)
            await db.commit()

            # 3. Harvest and aggregate analysis data.
            user_brief = await _prepare_user_brief(db, user_uuid)
            competitor_brief = await _prepare_competitor_brief(db, user_uuid)

            set_progress(job, 88)
            await db.commit()

            # 4. Call AI strategist.
            if remaining_gemini_budget(reserve=0) < 1:
                raise GeminiQuotaExceededError(
                    "No Gemini budget left today for the final report. "
                    "Video analysis used the remaining free-tier quota. Try again tomorrow."
                )

            report_data = await generate_strategic_report_service(user_brief, competitor_brief)
            if report_data is None:
                raise RuntimeError("The AI strategist is not configured (missing GEMINI_API_KEY).")

            set_progress(job, 95)
            await db.commit()

            # 5. Save the report, its roadmap and the job outcome in one transaction.
            now = utc_now()
            report = AccountReport(
                user_id=user_uuid,
                title=f"Growth Strategy - {now.strftime('%B %Y')}",
                status="ready",
                summary=report_data.summary,
                report_json=report_data.model_dump(),
                report_markdown=report_data.report_markdown,
                created_at=now,
                updated_at=now,
            )
            db.add(report)
            await db.flush()

            for item in report_data.roadmap:
                db.add(
                    Recommendation(
                        user_id=user_uuid,
                        account_report_id=report.id,
                        recommedation_type=item.type,
                        title=item.title,
                        description=item.description,
                        priority=item.priority,
                        evidence=item.evidence,
                        status="pending",
                    )
                )

            mark_succeeded(job)
            await db.commit()

        except Exception as e:
            logger.exception(f"Error in report generation task: {e}")
            if job:
                await db.rollback()
                failed_job = await db.get(AnalysisJob, UUID(job_id))
                if failed_job:
                    mark_failed(failed_job, str(e))
                    db.add(failed_job)
                    await db.commit()

async def get_latest_report_service(user_id: UUID, db: AsyncSession):
    """
    Returns the most recently generated strategic report for the user.
    """
    stmt = select(AccountReport).where(AccountReport.user_id == user_id).order_by(desc(AccountReport.created_at)).limit(1)
    report = (await db.exec(stmt)).first()
    if not report:
        raise HTTPException(status_code=404, detail="No growth strategy found. Start onboarding or trigger a new generation.")
    return report


async def list_reports_service(user_id: UUID, db: AsyncSession) -> list[AccountReport]:
    stmt = (
        select(AccountReport)
        .where(AccountReport.user_id == user_id)
        .order_by(desc(AccountReport.created_at))
    )
    return (await db.exec(stmt)).all()


async def get_report_by_id_service(report_id: UUID, user_id: UUID, db: AsyncSession) -> AccountReport:
    report = await db.get(AccountReport, report_id)
    if not report or report.user_id != user_id:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


async def get_recommendations_for_report_service(
    report_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> list[Recommendation]:
    report = await get_report_by_id_service(report_id, user_id, db)
    stmt = (
        select(Recommendation)
        .where(Recommendation.account_report_id == report.id)
        .order_by(desc(Recommendation.priority))
    )
    return (await db.exec(stmt)).all()

async def get_roadmap_service(user_id: UUID, db: AsyncSession):
    """
    Returns the individual actionable recommendations from the user's latest roadmap.
    """
    report = await get_latest_report_service(user_id, db)
    stmt = select(Recommendation).where(Recommendation.account_report_id == report.id).order_by(desc(Recommendation.priority))
    results = await db.exec(stmt)
    return results.all()

async def _has_video_analysis(db: AsyncSession, user_id: UUID) -> bool:
    stmt = select(VideoAnalysis).where(VideoAnalysis.user_id == user_id).limit(1)
    return (await db.exec(stmt)).first() is not None


async def _prepare_user_brief(db: AsyncSession, user_id: UUID):
    stmt = select(VideoAnalysis).where(
        VideoAnalysis.user_id == user_id,
        VideoAnalysis.media_source == MediaSource.OWN
    )
    results = await db.exec(stmt)
    analyses = results.all()
    
    if not analyses: return {"status": "No data available"}
    
    return {
        "video_count": len(analyses),
        "top_topics": [a.topic for a in analyses[:5]],
        "average_hook_score": sum(a.hook_score for a in analyses) / len(analyses),
        "dominant_category": max(set([a.category for a in analyses]), key=[a.category for a in analyses].count)
    }

async def _prepare_competitor_brief(db: AsyncSession, user_id: UUID):
    stmt = select(VideoAnalysis).where(
        VideoAnalysis.user_id == user_id,
        VideoAnalysis.media_source == MediaSource.COMPETITOR
    )
    results = await db.exec(stmt)
    analyses = results.all()
    
    if not analyses: return {"status": "No data available"}
    
    return {
        "competitor_video_count": len(analyses),
        "winning_topics": [a.topic for a in analyses if a.hook_score >= WINNING_HOOK_SCORE],
        "market_avg_hook_score": sum(a.hook_score for a in analyses) / len(analyses),
        "successful_formats": sorted({a.category for a in analyses if a.hook_score >= STRONG_HOOK_SCORE})
    }
