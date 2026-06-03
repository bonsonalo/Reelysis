import asyncio
import json
from datetime import datetime, timezone
from uuid import UUID
from sqlmodel import select, col
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import engine
from app.core.logger import logger
from app.core.celery_app import celery_app
from app.model.video_analysis import VideoAnalysis, MediaSource
from app.model.analysis_job import AnalysisJob
from app.model.account_report import AccountReport
from app.model.recommendations import Recommendation
from app.service.ai_service import generate_strategic_report_service

async def trigger_report_generation_service(user_id: UUID, db: AsyncSession):
    """
    Triggers the generation of a new strategic growth report.
    """
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
    return asyncio.run(_generate_report_internal(job_id, user_id))

async def _generate_report_internal(job_id: str, user_id: str):
    async with AsyncSession(engine) as db:
        try:
            job = await db.get(AnalysisJob, UUID(job_id))
            if not job: return
            
            job.status = "running"
            job.started_at = datetime.now(timezone.utc)
            await db.commit()

            # 1. Harvest and Aggregate Data
            user_brief = await _prepare_user_brief(db, UUID(user_id))
            competitor_brief = await _prepare_competitor_brief(db, UUID(user_id))
            
            job.progress = 30
            await db.commit()

            # 2. Call AI Strategist
            report_data = await generate_strategic_report_service(user_brief, competitor_brief)
            
            if not report_data:
                raise Exception("AI failed to generate report.")

            job.progress = 80
            await db.commit()

            # 3. Save the Final Report
            report = AccountReport(
                user_id=UUID(user_id),
                title=f"Growth Strategy - {datetime.now().strftime('%B %Y')}",
                status="ready",
                summary=report_data.summary,
                report_json=report_data.model_dump(),
                report_markdown=report_data.report_markdown,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(report)
            await db.commit()
            await db.refresh(report)

            # 4. Save individual Roadmap Recommendations
            for item in report_data.roadmap:
                rec = Recommendation(
                    user_id=UUID(user_id),
                    account_report_id=report.id,
                    recommedation_type=item.type,
                    title=item.title,
                    description=item.description,
                    priority=item.priority,
                    evidence=item.evidence,
                    status="pending"
                )
                db.add(rec)
            
            job.status = "succeeded"
            job.progress = 100
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()

        except Exception as e:
            logger.error(f"Error in report generation task: {e}")
            if job:
                job.status = "failed"
                job.error_message = str(e)
                await db.commit()

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
        "winning_topics": [a.topic for a in analyses if a.hook_score >= 8],
        "market_avg_hook_score": sum(a.hook_score for a in analyses) / len(analyses),
        "successful_formats": list(set([a.category for a in analyses if a.hook_score >= 7]))
    }
