from sqlmodel.ext.asyncio.session import AsyncSession
from uuid import UUID
from fastapi import HTTPException
from app.model.analysis_job import AnalysisJob
from sqlmodel import select, desc
from typing import Optional
from app.service.instagram_service import reconcile_instagram_sync_job
from app.service.competitor_service import reconcile_competitor_discovery_job
from app.service.report_service import reconcile_report_generation_job

async def get_job_status_service(job_id: UUID, user_id: UUID, db: AsyncSession):

    # Business logic for retrieving a job status.
    # Validates existence and ownership.

    job = await db.get(AnalysisJob, job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this job")

    if job.job_type == "instagram_sync":
        job = await reconcile_instagram_sync_job(job, db)
    elif job.job_type == "competitor_discovery":
        job = await reconcile_competitor_discovery_job(job, db)
    elif job.job_type == "report_generation":
        job = await reconcile_report_generation_job(job, db)
        
    return job

async def get_user_jobs_service(
    user_id: UUID,
    job_type: Optional[str],
    db: AsyncSession,
    limit: Optional[int] = None,
):
    """
    Retrieves background jobs for a specific user, optionally filtered by type.
    """
    stmt = select(AnalysisJob).where(AnalysisJob.user_id == user_id)
    if job_type:
        stmt = stmt.where(AnalysisJob.job_type == job_type)
    
    stmt = stmt.order_by(desc(AnalysisJob.created_at))
    if limit is not None:
        stmt = stmt.limit(limit)
    result = await db.exec(stmt)
    jobs = result.all()

    if job_type == "report_generation" and jobs:
        reconciled = []
        for job in jobs:
            if job.status in ("queued", "running"):
                job = await reconcile_report_generation_job(job, db)
            reconciled.append(job)
        return reconciled

    return jobs
