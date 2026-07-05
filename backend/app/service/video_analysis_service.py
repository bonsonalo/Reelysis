import asyncio
from datetime import datetime, timezone
from uuid import UUID
from sqlmodel import select, col, desc, Session
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.core.database import engine, sync_engine
from app.core.logger import logger
from app.core.celery_app import celery_app
from app.model.media_items import MediaItem
from app.model.competitor_media import CompetitorMedia
from app.model.media_metrics import MediaMetric
from app.model.video_analysis import VideoAnalysis, MediaSource
from app.model.analysis_job import AnalysisJob
from app.service.ai_service import analyze_video_service, GeminiQuotaExceededError, remaining_gemini_budget
from app.core.config import settings
from app.utils.scoring import normalize_score_0_100

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
    return _run_analysis_internal(job_id, user_id)

def _competitor_engagement(item: CompetitorMedia) -> int:
    metrics = item.metrics or {}
    views = int(metrics.get("view_count") or metrics.get("views") or 0)
    likes = int(metrics.get("like_count") or metrics.get("likes") or 0)
    comments = int(metrics.get("comment_count") or metrics.get("comments") or 0)
    return views + likes * 10 + comments * 5


def _select_videos_for_budget(
    own_media: list[MediaItem],
    comp_media: list[CompetitorMedia],
    gemini_budget: int | None,
) -> tuple[list[MediaItem], list[CompetitorMedia]]:
    """Pick the highest-value unanalyzed videos that fit today's Gemini budget."""
    if gemini_budget is None:
        return own_media, comp_media
    if gemini_budget <= 0:
        return [], []

    own_sorted = sorted(
        own_media,
        key=lambda item: item.published_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    comp_sorted = sorted(comp_media, key=_competitor_engagement, reverse=True)

    max_own = min(len(own_sorted), settings.REPORT_MAX_OWN_VIDEOS, gemini_budget)
    own_selected = own_sorted[:max_own]
    remaining = gemini_budget - len(own_selected)
    comp_selected = comp_sorted[
        : min(len(comp_sorted), settings.REPORT_MAX_COMPETITOR_VIDEOS, remaining)
    ]

    if len(own_selected) + len(comp_selected) < len(own_media) + len(comp_media):
        logger.info(
            "Free-tier Gemini budget: analyzing %d/%d own + %d/%d competitor videos "
            "(budget=%d for video analysis; %d reserved for report)",
            len(own_selected),
            len(own_media),
            len(comp_selected),
            len(comp_media),
            gemini_budget,
            settings.GEMINI_REPORT_RESERVE,
        )

    return own_selected, comp_selected


def _run_analysis_internal(job_id: str, user_id: str, gemini_budget: int | None = None):
    try:
        job_uuid = UUID(job_id)
        user_uuid = UUID(user_id)
    except Exception as e:
        logger.error(f"Invalid UUID arguments in video analysis task: job_id={job_id}, user_id={user_id}, error={e}")
        return

    with Session(sync_engine) as db:
        try:
            job = db.get(AnalysisJob, job_uuid)
            if not job:
                logger.error(f"Video analysis task could not find job {job_uuid}")
                return
            
            job.status = "running"
            job.started_at = datetime.now(timezone.utc)
            db.commit()

            # 1. Find all unanalyzed videos
            own_media = _get_unanalyzed_own_media(db, UUID(user_id))
            comp_media = _get_unanalyzed_competitor_media(db, UUID(user_id))
            own_media, comp_media = _select_videos_for_budget(own_media, comp_media, gemini_budget)
            
            total_videos = len(own_media) + len(comp_media)
            if total_videos == 0:
                job.status = "succeeded"
                job.progress = 100
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
                return

            processed_count = 0

            # 2. Analyze own media
            for item in own_media:
                m_stmt = select(MediaMetric).where(MediaMetric.media_item_id == item.id).order_by(col(MediaMetric.captured_at).desc()).limit(1)
                latest_m = db.exec(m_stmt).first()
                
                score = 0
                if latest_m:
                    score = _calculate_engagement_score(latest_m.total_interactions, latest_m.view)

                analysis_data = asyncio.run(analyze_video_service(
                    caption=item.caption,
                    transcript=item.transcript_text,
                    hashtags=item.hashtag.get("names", []) if isinstance(item.hashtag, dict) else []
                ))
                if analysis_data:
                    if not (item.transcript_text or "").strip():
                        analysis_data.confidence = min(analysis_data.confidence, 65)
                    _save_analysis(db, UUID(user_id), MediaSource.OWN, analysis_data, engagement_score=score, media_item_id=item.id)
                
                processed_count += 1
                job.progress = int((processed_count / total_videos) * 100)
                db.commit()

            # 3. Analyze competitor media
            for item in comp_media:
                m = item.metrics or {}
                views = m.get("view_count") or m.get("views", 0)
                likes = m.get("like_count") or m.get("likes", 0)
                comments = m.get("comment_count") or m.get("comments", 0)
                
                score = _calculate_engagement_score(likes + comments, views)

                analysis_data = asyncio.run(analyze_video_service(
                    caption=item.caption,
                    transcript=item.transcript_text,
                    hashtags=item.hashtags.get("names", []) if isinstance(item.hashtags, dict) else []
                ))
                if analysis_data:
                    if not (item.transcript_text or "").strip():
                        analysis_data.confidence = min(analysis_data.confidence, 65)
                    _save_analysis(db, UUID(user_id), MediaSource.COMPETITOR, analysis_data, engagement_score=score, competitor_media_id=item.id)
                
                processed_count += 1
                job.progress = int((processed_count / total_videos) * 100)
                db.commit()

            job.status = "succeeded"
            job.completed_at = datetime.now(timezone.utc)
            db.commit()

        except GeminiQuotaExceededError:
            raise
        except Exception as e:
            logger.error(f"Error in bulk analysis task: {e}")
            if job:
                job.status = "failed"
                job.error_message = str(e)
                db.commit()

def run_video_analysis_sync(user_id: UUID, gemini_budget: int | None = None) -> None:
    """Run pending video analysis inline for report generation."""
    if gemini_budget is None:
        gemini_budget = remaining_gemini_budget(reserve=settings.GEMINI_REPORT_RESERVE)
    with Session(sync_engine) as db:
        job = AnalysisJob(
            user_id=user_id,
            job_type="video_analysis",
            status="queued",
            progress=0,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        _run_analysis_internal(str(job.id), str(user_id), gemini_budget=gemini_budget)


async def get_video_analysis_service(video_id: UUID, user_id: UUID, db: AsyncSession):
    """
    Retrieves the full AI analysis and performance metrics for a specific video.
    """
    # 1. Fetch Media Item
    media = await db.get(MediaItem, video_id)
    if not media or media.user_id != user_id:
        raise HTTPException(status_code=404, detail="Video not found")
        
    # 2. Fetch Latest Analysis
    stmt = (
        select(VideoAnalysis)
        .where(VideoAnalysis.media_item_id == video_id)
        .order_by(desc(VideoAnalysis.created_at))
        .limit(1)
    )
    analysis = (await db.exec(stmt)).first()
    if analysis:
        analysis.hook_score = normalize_score_0_100(analysis.hook_score)
        analysis.confidence = normalize_score_0_100(analysis.confidence)
    
    # 3. Fetch Latest Metrics
    m_stmt = select(MediaMetric).where(MediaMetric.media_item_id == video_id).order_by(desc(MediaMetric.captured_at)).limit(1)
    latest_metrics = (await db.exec(m_stmt)).first()
    
    return {
        "media": media,
        "analysis": analysis,
        "metrics": latest_metrics
    }

def _calculate_engagement_score(interactions: int, views: int) -> int:
    """Returns a score from 0-100 representing engagement quality."""
    if not views or views == 0:
        return 0
    return min(round((interactions / views) * 100), 100)

def _get_unanalyzed_own_media(db: Session, user_id: UUID):
    stmt = select(MediaItem).where(
        MediaItem.user_id == user_id
    ).join(
        VideoAnalysis, MediaItem.id == VideoAnalysis.media_item_id, isouter=True
    ).where(
        VideoAnalysis.id == None
    )
    result = db.exec(stmt)
    return result.all()

def _get_unanalyzed_competitor_media(db: Session, user_id: UUID):
    stmt = select(CompetitorMedia).where(
        CompetitorMedia.user_id == user_id
    ).join(
        VideoAnalysis, CompetitorMedia.id == VideoAnalysis.competitor_media_id, isouter=True
    ).where(
        VideoAnalysis.id == None
    )
    result = db.exec(stmt)
    return result.all()

def _save_analysis(db: Session, user_id: UUID, source: MediaSource, data, engagement_score: int, media_item_id=None, competitor_media_id=None):
    hook_score = normalize_score_0_100(data.hook_score)
    confidence = normalize_score_0_100(data.confidence)
    detail = data.model_dump()
    detail["hook_score"] = hook_score
    detail["confidence"] = confidence

    analysis = VideoAnalysis(
        user_id=user_id,
        media_source=source,
        media_item_id=media_item_id,
        competitor_media_id=competitor_media_id,
        topic=data.topic,
        category=data.category,
        content_pillar=data.content_pillar,
        confidence=confidence,
        hook_score=hook_score,
        engagement_score=engagement_score,
        analysis_detail=detail,
        created_at=datetime.now(timezone.utc)
    )
    db.add(analysis)
    db.commit()
