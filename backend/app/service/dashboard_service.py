from sqlmodel import select, func, desc
from sqlmodel.ext.asyncio.session import AsyncSession
from app.model.media_items import MediaItem
from app.model.media_metrics import MediaMetric
from app.model.video_analysis import VideoAnalysis, MediaSource
from uuid import UUID
from sqlalchemy.orm import aliased

async def get_dashboard_stats_service(user_id: UUID, db: AsyncSession):
    # 1. Get total media items
    stmt_media = select(func.count(MediaItem.id)).where(MediaItem.user_id == user_id)
    total_media = (await db.exec(stmt_media)).one()
    
    if total_media == 0:
        return {
            "total_views": 0,
            "avg_reach": 0,
            "avg_engagement": 0,
            "top_hook_score": 0,
            "views_change": "0%",
            "reach_change": "0%",
            "engagement_change": "0%",
            "hook_change": "0"
        }

    # 2. Get the latest metric for each media item
    # Since we might have multiple snapshots, we take the one with the latest captured_at
    subquery = select(
        MediaMetric.media_item_id,
        func.max(MediaMetric.captured_at).label("max_captured")
    ).join(MediaItem).where(MediaItem.user_id == user_id).group_by(MediaMetric.media_item_id).subquery()
    
    latest_metrics_stmt = select(MediaMetric).join(
        subquery,
        (MediaMetric.media_item_id == subquery.c.media_item_id) & 
        (MediaMetric.captured_at == subquery.c.max_captured)
    )
    
    metrics_result = await db.exec(latest_metrics_stmt)
    latest_metrics = metrics_result.all()

    total_views = sum(m.view for m in latest_metrics)
    total_reach = sum(m.reach for m in latest_metrics)
    total_interactions = sum(m.total_interactions for m in latest_metrics)
    
    avg_reach = total_reach / len(latest_metrics) if latest_metrics else 0
    avg_engagement = (total_interactions / total_reach * 100) if total_reach > 0 else 0

    # 3. Get Hook Scores from VideoAnalysis
    stmt_analysis = select(func.avg(VideoAnalysis.hook_score)).where(
        VideoAnalysis.user_id == user_id,
        VideoAnalysis.media_source == MediaSource.OWN
    )
    avg_hook_score = (await db.exec(stmt_analysis)).one() or 0

    return {
        "total_views": total_views,
        "avg_reach": int(avg_reach),
        "avg_engagement": round(avg_engagement, 1),
        "top_hook_score": round(avg_hook_score, 1),
        "views_change": "+0%", # Placeholder for historical comparison
        "reach_change": "+0%",
        "engagement_change": "+0%",
        "hook_change": "+0"
    }
