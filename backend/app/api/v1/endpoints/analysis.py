from fastapi import APIRouter, Depends
from uuid import UUID

from app.api.dep import db_dependency, user_authentication_dependency
from app.service.analysis_service import get_job_status_service

router = APIRouter(
    prefix="/api/v1/analysis",
    tags=["analysis"]
)

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
    job = await get_job_status_service(job_id, current_user.id, db)
    
    return {
        "id": job.id,
        "type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "error_message": job.error_message,
        "started_at": job.started_at,
        "completed_at": job.completed_at
    }
