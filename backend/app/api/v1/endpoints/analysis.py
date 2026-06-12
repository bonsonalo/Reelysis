from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from typing import List, Optional

from app.api.dep import db_dependency, user_authentication_dependency
from app.service.analysis_service import get_job_status_service, get_user_jobs_service
from app.service.report_service import trigger_report_generation_service
from app.service.dashboard_service import get_dashboard_stats_service, get_growth_chart_service, get_content_pillars_service
from app.schema.dashboard_schema import DashboardStats, DashboardGrowthResponse, DashboardPillarsResponse
from sqlmodel import select
from app.model.analysis_job import AnalysisJob

router = APIRouter(
    prefix="/api/v1/analysis",
    tags=["analysis"]
)

@router.get("/jobs", response_model=List[AnalysisJob])
async def get_jobs(
    db: db_dependency,
    current_user: user_authentication_dependency,
    job_type: Optional[str] = Query(None, alias="type")
):
    """
    Returns the list of background jobs for the current user.
    """
    try:
        jobs = await get_user_jobs_service(current_user["id"], job_type, db)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: UUID,
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Endpoint to poll the status of a background job.
    Delegates logic to the analysis_service.
    """
    job = await get_job_status_service(job_id, current_user["id"], db)
    
    return {
        "id": job.id,
        "type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "error_message": job.error_message,
        "started_at": job.started_at,
        "completed_at": job.completed_at
    }

@router.post("/report/generate")
async def generate_report(
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Manually triggers the strategic report generation job.
    """
    try:
        job = await trigger_report_generation_service(current_user["id"], db)
        return {
            "message": "Report generation triggered",
            "job_id": job.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
