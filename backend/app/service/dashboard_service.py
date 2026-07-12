from datetime import datetime, timedelta
from app.utils.time import utc_now
from uuid import UUID

from sqlmodel import select, func, desc
from sqlmodel.ext.asyncio.session import AsyncSession
from app.model.media_items import MediaItem
from app.model.media_metrics import MediaMetric
from app.model.video_analysis import VideoAnalysis, MediaSource
from app.utils.scoring import normalize_score_0_100


def _format_percent_change(current: float, previous: float) -> str:
    if previous == 0:
        if current == 0:
            return "0%"
        return "+100%"
    change = ((current - previous) / previous) * 100
    rounded = round(change, 1)
    if rounded == int(rounded):
        rounded = int(rounded)
    sign = "+" if rounded >= 0 else ""
    return f"{sign}{rounded}%"


def _sum_metrics_for_snapshot(metrics: list[MediaMetric]) -> dict:
    total_views = sum(m.view for m in metrics)
    total_reach = sum(m.reach for m in metrics)
    total_interactions = sum(m.total_interactions for m in metrics)
    avg_engagement = (total_interactions / total_reach * 100) if total_reach > 0 else 0
    return {
        "total_views": total_views,
        "avg_reach": total_reach / len(metrics) if metrics else 0,
        "avg_engagement": avg_engagement,
    }


async def _get_latest_and_previous_metric_sets(db: AsyncSession, user_id: UUID):
    stmt = (
        select(MediaMetric)
        .join(MediaItem)
        .where(MediaItem.user_id == user_id)
        .order_by(MediaMetric.media_item_id, desc(MediaMetric.captured_at))
    )
    rows = (await db.exec(stmt)).all()

    latest_by_media: dict = {}
    previous_by_media: dict = {}
    for metric in rows:
        media_id = metric.media_item_id
        if media_id not in latest_by_media:
            latest_by_media[media_id] = metric
        elif media_id not in previous_by_media:
            previous_by_media[media_id] = metric

    latest_metrics = list(latest_by_media.values())
    previous_metrics = list(previous_by_media.values())
    return latest_metrics, previous_metrics


async def _get_latest_and_previous_hook_scores(
    db: AsyncSession, user_id: UUID
) -> tuple[dict[UUID, int], dict[UUID, int], dict[UUID, int], dict[UUID, int]]:
    """Latest and previous hook/confidence scores keyed by own media item id."""
    stmt = (
        select(VideoAnalysis)
        .where(
            VideoAnalysis.user_id == user_id,
            VideoAnalysis.media_source == MediaSource.OWN,
            VideoAnalysis.media_item_id.isnot(None),
        )
        .order_by(VideoAnalysis.media_item_id, desc(VideoAnalysis.created_at))
    )
    rows = (await db.exec(stmt)).all()

    latest_hooks: dict[UUID, int] = {}
    previous_hooks: dict[UUID, int] = {}
    latest_confidence: dict[UUID, int] = {}
    previous_confidence: dict[UUID, int] = {}
    for analysis in rows:
        media_id = analysis.media_item_id
        if media_id not in latest_hooks:
            latest_hooks[media_id] = normalize_score_0_100(analysis.hook_score)
            latest_confidence[media_id] = normalize_score_0_100(analysis.confidence)
        elif media_id not in previous_hooks:
            previous_hooks[media_id] = normalize_score_0_100(analysis.hook_score)
            previous_confidence[media_id] = normalize_score_0_100(analysis.confidence)

    return latest_hooks, previous_hooks, latest_confidence, previous_confidence


def _format_hook_point_change(current: float, previous: float) -> str:
    """Point delta for 0-100 hook scores (e.g. 80 -> 85 => '+5')."""
    if not previous:
        return "0"
    delta = int(round(current - previous))
    if delta > 0:
        return f"+{delta}"
    if delta < 0:
        return str(delta)
    return "+0"


def _metric_snapshot_rank(metric: MediaMetric) -> tuple:
    """Prefer rows with real view counts (older syncs sometimes have reach but views=0)."""
    return (metric.view, metric.reach, metric.captured_at.timestamp())


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
            "top_analysis_confidence": 0,
            "views_change": "0%",
            "reach_change": "0%",
            "engagement_change": "0%",
            "hook_change": "0",
            "has_video_analysis": False,
        }

    # 2. Compare latest vs previous metric snapshots per media item
    latest_metrics, previous_metrics = await _get_latest_and_previous_metric_sets(db, user_id)
    current_totals = _sum_metrics_for_snapshot(latest_metrics)
    previous_totals = _sum_metrics_for_snapshot(previous_metrics)

    total_views = int(current_totals["total_views"])
    avg_reach = int(current_totals["avg_reach"])
    avg_engagement = round(current_totals["avg_engagement"], 1)

    views_change = _format_percent_change(current_totals["total_views"], previous_totals["total_views"])
    reach_change = _format_percent_change(current_totals["avg_reach"], previous_totals["avg_reach"])
    engagement_change = _format_percent_change(
        current_totals["avg_engagement"],
        previous_totals["avg_engagement"],
    )

    # 3. Hook scores: top = best latest score; change = that reel vs its prior analysis
    latest_hooks, previous_hooks, latest_confidence, _previous_confidence = (
        await _get_latest_and_previous_hook_scores(db, user_id)
    )
    top_hook_score = float(max(latest_hooks.values())) if latest_hooks else 0.0

    top_analysis_confidence = 0.0
    hook_change = "0"
    if latest_hooks:
        top_score = int(top_hook_score)
        hook_change = "+0"
        for media_id, score in latest_hooks.items():
            if score == top_score:
                top_analysis_confidence = float(latest_confidence.get(media_id, 0))
                if media_id in previous_hooks:
                    hook_change = _format_hook_point_change(score, previous_hooks[media_id])
                break

    has_video_analysis = bool(latest_hooks)

    return {
        "total_views": total_views,
        "avg_reach": avg_reach,
        "avg_engagement": avg_engagement,
        "top_hook_score": top_hook_score,
        "top_analysis_confidence": top_analysis_confidence,
        "views_change": views_change,
        "reach_change": reach_change,
        "engagement_change": engagement_change,
        "hook_change": hook_change,
        "has_video_analysis": has_video_analysis,
    }

async def get_growth_chart_service(user_id: UUID, db: AsyncSession):
    thirty_days_ago = utc_now() - timedelta(days=30)

    stmt = (
        select(MediaMetric, MediaItem)
        .join(MediaItem)
        .where(
            MediaItem.user_id == user_id,
            MediaMetric.captured_at >= thirty_days_ago,
        )
        .order_by(MediaMetric.captured_at)
    )

    result = await db.exec(stmt)
    rows = result.all()

    # Keep only the latest snapshot per reel per calendar day (each sync inserts a row;
    # summing every row would multiply views by the number of syncs that day).
    latest_per_day_media: dict[tuple[str, UUID], MediaMetric] = {}
    for metric, _item in rows:
        date_key = metric.captured_at.strftime("%Y-%m-%d")
        key = (date_key, metric.media_item_id)
        existing = latest_per_day_media.get(key)
        if not existing or _metric_snapshot_rank(metric) > _metric_snapshot_rank(existing):
            latest_per_day_media[key] = metric

    daily_data: dict[str, dict[str, int]] = {}
    for (date_key, _media_id), metric in latest_per_day_media.items():
        if date_key not in daily_data:
            daily_data[date_key] = {"views": 0, "reach": 0}
        daily_data[date_key]["views"] += metric.view
        daily_data[date_key]["reach"] += metric.reach

    sorted_data = sorted(daily_data.items())
    chart_points = [
        {
            "date": datetime.strptime(date, "%Y-%m-%d").strftime("%b %d"),
            "views": int(data["views"]),
            "reach": int(data["reach"]),
        }
        for date, data in sorted_data
    ]
    # Drop leading days with no views once real view data exists (partial early syncs).
    first_with_views = next((i for i, p in enumerate(chart_points) if p["views"] > 0), None)
    if first_with_views is not None and first_with_views > 0:
        chart_points = chart_points[first_with_views:]

    return {"data": chart_points}

async def get_content_pillars_service(user_id: UUID, db: AsyncSession):
    """
    Returns aggregated stats for the user's content pillars using real Reel engagement %.
    """
    stmt = select(VideoAnalysis).where(
        VideoAnalysis.user_id == user_id,
        VideoAnalysis.media_source == MediaSource.OWN,
        VideoAnalysis.media_item_id.isnot(None),
    )
    analyses = (await db.exec(stmt)).all() or []

    pillar_stats: dict[str, dict] = {}
    for analysis in analyses:
        pillar = analysis.content_pillar or "Uncategorized"
        if pillar not in pillar_stats:
            pillar_stats[pillar] = {"count": 0, "engagement_rates": []}

        pillar_stats[pillar]["count"] += 1

        m_stmt = (
            select(MediaMetric)
            .where(MediaMetric.media_item_id == analysis.media_item_id)
            .order_by(desc(MediaMetric.captured_at))
            .limit(1)
        )
        latest_m = (await db.exec(m_stmt)).first()
        if latest_m and latest_m.reach > 0:
            rate = (latest_m.total_interactions / latest_m.reach) * 100
            pillar_stats[pillar]["engagement_rates"].append(rate)

    rows = []
    for pillar, stats in pillar_stats.items():
        rates = stats["engagement_rates"]
        avg = round(sum(rates) / len(rates), 1) if rates else 0.0
        rows.append(
            {
                "pillar": pillar,
                "count": stats["count"],
                "avg_engagement": avg,
            }
        )

    rows.sort(key=lambda r: r["avg_engagement"], reverse=True)
    return {"data": rows}

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
        ).order_by(desc(VideoAnalysis.created_at)).limit(1)
        analysis = (await db.exec(a_stmt)).first()
        
        views = latest_m.view if latest_m else 0
        reach = latest_m.reach if latest_m else 0
        engagement = (latest_m.total_interactions / reach * 100) if latest_m and reach > 0 else 0
        
        video_feed.append({
            "id": str(item.id),
            "thumbnail_url": item.thumbnail_url,
            "caption": item.caption,
            "hook_score": normalize_score_0_100(analysis.hook_score) if analysis else 0,
            "views": views,
            "engagement_rate": round(engagement, 1),
            "permalink": item.permalink,
            "has_analysis": analysis is not None,
        })
        
    return {"data": video_feed}
