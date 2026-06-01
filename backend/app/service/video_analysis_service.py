import asyncio
from datetime import datetime, timezone
from uuid import UUID
from sqlmodel import select, col
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import engine
from app.core.logger import logger
from app.core.celery_app import celery_app
from app.model.media_items import MediaItem
from app.model.competitor_media import CompetitorMedia
from app.model.video_analysis import VideoAnalysis, MediaSource
from app.model.analysis_job import AnalysisJob
from app.service.ai_service import analyze_video_service

async def run_bulk_video_analysis_service(user_id: UUID, db: AsyncSession):
    """
    Triggers the bulk analysis of all unanalyzed videos for a user.
    """
    job = AnalysisJob(
        user_id=user_id,
        job_type="video_analysis",
        status="queued",
        progress=0
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    celery_app.send_task(
        "app.service.video_analysis_service.run_video_analysis_task",
        args=[str(job.id), str(user_id)]
    )
    return job

@celery_app.task(name="app.service.video_analysis_service.run_video_analysis_task")
def run_video_analysis_task(job_id: str, user_id: str):
    return asyncio.run(_run_analysis_internal(job_id, user_id))

async def _run_analysis_internal(job_id: str, user_id: str):
    async with AsyncSession(engine) as db:
        try:
            job = await db.get(AnalysisJob, UUID(job_id))
            if not job: return
            
            job.status = "running"
            job.started_at = datetime.now(timezone.utc)
            await db.commit()

            # 1. Find all unanalyzed videos
            own_media = await _get_unanalyzed_own_media(db, UUID(user_id))
            comp_media = await _get_unanalyzed_competitor_media(db, UUID(user_id))
            
            total_videos = len(own_media) + len(comp_media)
            if total_videos == 0:
                job.status = "succeeded"
                job.progress = 100
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return

            processed_count = 0

            # 2. Analyze own media
            for item in own_media:
                analysis_data = await analyze_video_service(
                    caption=item.caption,
                    transcript=getattr(item, "transcript_text", ""),
                    hashtags=item.hashtag.get("names", []) if isinstance(item.hashtag, dict) else []
                )
                if analysis_data:
                    await _save_analysis(db, UUID(user_id), MediaSource.OWN, analysis_data, media_item_id=item.id)
                
                processed_count += 1
                job.progress = int((processed_count / total_videos) * 100)
                await db.commit()

            # 3. Analyze competitor media
            for item in comp_media:
                analysis_data = await analyze_video_service(
                    caption=item.caption,
                    transcript=item.transcript_text,
                    hashtags=item.hashtags.get("names", []) if isinstance(item.hashtags, dict) else []
                )
                if analysis_data:
                    await _save_analysis(db, UUID(user_id), MediaSource.COMPETITOR, analysis_data, competitor_media_id=item.id)
                
                processed_count += 1
                job.progress = int((processed_count / total_videos) * 100)
                await db.commit()

            job.status = "succeeded"
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()

        except Exception as e:
            logger.error(f"Error in bulk analysis task: {e}")
            if job:
                job.status = "failed"
                job.error_message = str(e)
                await db.commit()

async def _get_unanalyzed_own_media(db: AsyncSession, user_id: UUID):
    # Left join MediaItem with VideoAnalysis to find items with NO analysis
    stmt = select(MediaItem).where(
        MediaItem.user_id == user_id
    ).join(
        VideoAnalysis, MediaItem.id == VideoAnalysis.media_item_id, isouter=True
    ).where(
        VideoAnalysis.id == None
    )
    result = await db.exec(stmt)
    return result.all()

async def _get_unanalyzed_competitor_media(db: AsyncSession, user_id: UUID):
    # Left join CompetitorMedia with VideoAnalysis
    stmt = select(CompetitorMedia).where(
        CompetitorMedia.user_id == user_id
    ).join(
        VideoAnalysis, CompetitorMedia.id == VideoAnalysis.competitor_media_id, isouter=True
    ).where(
        VideoAnalysis.id == None
    )
    result = await db.exec(stmt)
    return result.all()

async def _save_analysis(db: AsyncSession, user_id: UUID, source: MediaSource, data, media_item_id=None, competitor_media_id=None):
    analysis = VideoAnalysis(
        user_id=user_id,
        media_source=source,
        media_item_id=media_item_id,
        competitor_media_id=competitor_media_id,
        topic=data.topic,
        category=data.category,
        content_pillar=data.content_pillar,
        confidence=data.confidence,
        hook_score=data.hook_score,
        engagement_score=0, # This will be calculated from metrics later
        analysis_detail=data.model_dump(),
        created_at=datetime.now(timezone.utc)
    )
    db.add(analysis)
    await db.commit()
