from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
from typing import List, Optional

from app.api.dep import db_dependency, user_authentication_dependency
from app.api.errors import internal_error
from app.service.analysis_service import get_job_status_service, get_user_jobs_service
from app.service.report_service import (
    get_latest_report_service,
    get_roadmap_service
)
from app.service.dashboard_service import (
    get_dashboard_stats_service, 
    get_growth_chart_service, 
    get_content_pillars_service,
    get_recent_videos_service
)
from app.service.video_analysis_service import get_video_analysis_service
from app.schema.dashboard_schema import (
    DashboardStats, 
    DashboardGrowthResponse, 
    DashboardPillarsResponse,
    DashboardVideosResponse,
    VideoDetailResponse
)
from sqlmodel import select
from app.model.analysis_job import AnalysisJob
from app.model.account_report import AccountReport
from app.model.recommendations import Recommendation

router = APIRouter(
    prefix="/api/v1/analysis",
    tags=["analysis"]
)

@router.get("/jobs", response_model=List[AnalysisJob])
async def get_jobs(
    db: db_dependency,
    current_user: user_authentication_dependency,
    job_type: Optional[str] = Query(None, alias="type"),
    limit: Optional[int] = Query(None, ge=1, le=50),
):
    """
    Returns the list of background jobs for the current user.
    """
    try:
        jobs = await get_user_jobs_service(current_user["id"], job_type, db, limit=limit)
        return jobs
    except Exception:
        raise internal_error("analysis.get_jobs")

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Returns aggregated metrics for the user's dashboard.
    """
    try:
        stats = await get_dashboard_stats_service(current_user["id"], db)
        return stats
    except Exception:
        raise internal_error("analysis.get_dashboard_stats")

@router.get("/dashboard/growth", response_model=DashboardGrowthResponse)
async def get_dashboard_growth(
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Returns daily time-series metrics for the user's dashboard chart.
    """
    try:
        data = await get_growth_chart_service(current_user["id"], db)
        return data
    except Exception:
        raise internal_error("analysis.get_dashboard_growth")

@router.get("/dashboard/pillars", response_model=DashboardPillarsResponse)
async def get_dashboard_pillars(
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Returns aggregated content pillar stats for the user.
    """
    try:
        data = await get_content_pillars_service(current_user["id"], db)
        return data
    except Exception:
        raise internal_error("analysis.get_dashboard_pillars")

@router.get("/dashboard/videos", response_model=DashboardVideosResponse)
async def get_dashboard_videos(
    db: db_dependency,
    current_user: user_authentication_dependency,
    limit: int = Query(6, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Returns the user's most recent Reels with their performance and AI scores.
    """
    try:
        data = await get_recent_videos_service(current_user["id"], db, limit, offset)
        return data
    except Exception:
        raise internal_error("analysis.get_dashboard_videos")

@router.get("/videos/{video_id}", response_model=VideoDetailResponse)
async def get_video_analysis(
    video_id: UUID,
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Returns a deep AI analysis for a specific video.
    """
    try:
        data = await get_video_analysis_service(video_id, current_user["id"], db)
        return data
    except HTTPException:
        raise
    except Exception:
        raise internal_error("analysis.get_video_analysis")

@router.get("/report/latest", response_model=AccountReport)
async def get_latest_report(
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Returns the most recently generated strategic report.
    """
    try:
        report = await get_latest_report_service(current_user["id"], db)
        return report
    except HTTPException:
        raise
    except Exception:
        raise internal_error("analysis.get_latest_report")

@router.get("/report/roadmap", response_model=List[Recommendation])
async def get_roadmap(
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Returns the actionable content roadmap.
    """
    try:
        roadmap = await get_roadmap_service(current_user["id"], db)
        return roadmap
    except HTTPException:
        raise
    except Exception:
        raise internal_error("analysis.get_roadmap")

@router.patch("/report/roadmap/{recommendation_id}")
async def update_recommendation_status(
    recommendation_id: UUID,
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Updates the status of a specific recommendation (e.g., mark as completed).
    """
    try:
        stmt = select(Recommendation).where(
            Recommendation.id == recommendation_id,
            Recommendation.user_id == current_user["id"]
        )
        recommendation = (await db.exec(stmt)).first()
        
        if not recommendation:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        # Toggle between 'pending' and 'completed'
        recommendation.status = "completed" if recommendation.status == "pending" else "pending"
        db.add(recommendation)
        await db.commit()
        
        return {
            "id": str(recommendation.id),
            "status": recommendation.status
        }
    except HTTPException:
        raise
    except Exception:
        raise internal_error("analysis.update_recommendation_status")

@router.get("/jobs/{job_id}", response_model=AnalysisJob)
async def get_job_status(
    job_id: UUID,
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Endpoint to poll the status of a background job.
    Delegates logic to the analysis_service.
    """
    try:
        return await get_job_status_service(job_id, current_user["id"], db)
    except HTTPException:
        raise
    except Exception:
        raise internal_error("analysis.get_job_status")
