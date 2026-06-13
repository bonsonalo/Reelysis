from sqlmodel import select, func, desc, col
from sqlmodel.ext.asyncio.session import AsyncSession
from app.model.media_items import MediaItem
from app.model.media_metrics import MediaMetric
from app.model.video_analysis import VideoAnalysis, MediaSource
from uuid import UUID
from datetime import datetime, timedelta, timezone

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
        "views_change": "+0%", 
        "reach_change": "+0%",
        "engagement_change": "+0%",
        "hook_change": "+0"
    }

async def get_growth_chart_service(user_id: UUID, db: AsyncSession):
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    stmt = select(
        func.date_trunc('day', MediaMetric.captured_at).label("day"),
        func.sum(MediaMetric.view).label("total_views"),
        func.sum(MediaMetric.reach).label("total_reach")
    ).join(MediaItem).where(
        MediaItem.user_id == user_id,
        MediaMetric.captured_at >= thirty_days_ago
    ).group_by(col("day")).order_by(col("day"))
    
    result = await db.exec(stmt)
    rows = result.all()
    return {"data": [{"date": r.day.strftime("%b %d"), "views": int(r.total_views), "reach": int(r.total_reach)} for r in rows]}

async def get_content_pillars_service(user_id: UUID, db: AsyncSession):
    """
    Returns aggregated stats for the user's content pillars.
    """
    stmt = select(
        VideoAnalysis.content_pillar,
        func.count(VideoAnalysis.id).label("count"),
        func.avg(VideoAnalysis.engagement_score).label("avg_engagement")
    ).where(
        VideoAnalysis.user_id == user_id,
        VideoAnalysis.media_source == MediaSource.OWN
    ).group_by(
        VideoAnalysis.content_pillar
    ).order_by(
        desc("avg_engagement")
    )
    
    result = await db.exec(stmt)
    rows = result.all()
    
    return {"data": [{"pillar": r.content_pillar, "count": r.count, "avg_engagement": round(float(r.avg_engagement), 1)} for r in rows]}

async def get_recent_videos_service(user_id: UUID, db: AsyncSession, limit: int = 6):
    """
    Returns the most recent Reels for the user with their latest metrics and AI scores.
    """
    # 1. Get recent media items
    stmt = select(MediaItem).where(
        MediaItem.user_id == user_id
    ).order_by(desc(MediaItem.published_at)).limit(limit)
    
    result = await db.exec(stmt)
    media_items = result.all()
    
    video_feed = []
    for item in media_items:
        # Get latest snapshot metrics
        m_stmt = select(MediaMetric).where(
            MediaMetric.media_item_id == item.id
        ).order_by(desc(MediaMetric.captured_at)).limit(1)
        latest_m = (await db.exec(m_stmt)).first()
        
        # Get AI analysis
        a_stmt = select(VideoAnalysis).where(
            VideoAnalysis.media_item_id == item.id
        ).limit(1)
        analysis = (await db.exec(a_stmt)).first()
        
        views = latest_m.view if latest_m else 0
        reach = latest_m.reach if latest_m else 0
        engagement = (latest_m.total_interactions / reach * 100) if latest_m and reach > 0 else 0
        
        video_feed.append({
            "id": str(item.id),
            "thumbnail_url": item.thumbnail_url,
            "caption": item.caption,
            "hook_score": analysis.hook_score if analysis else 0,
            "views": views,
            "engagement_rate": round(engagement, 1),
            "permalink": item.permalink
        })
        
    return {"data": video_feed}
