from sqlmodel.ext.asyncio.session import AsyncSession
from uuid import UUID
from fastapi import HTTPException
from app.model.analysis_job import AnalysisJob
from sqlmodel import select, desc
from typing import Optional

async def get_job_status_service(job_id: UUID, user_id: UUID, db: AsyncSession):

    # Business logic for retrieving a job status.
    # Validates existence and ownership.

    job = await db.get(AnalysisJob, job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this job")
        
    return job

async def get_user_jobs_service(user_id: UUID, job_type: Optional[str], db: AsyncSession):
    """
    Retrieves background jobs for a specific user, optionally filtered by type.
    """
    stmt = select(AnalysisJob).where(AnalysisJob.user_id == user_id)
    if job_type:
        stmt = stmt.where(AnalysisJob.job_type == job_type)
    
    stmt = stmt.order_by(desc(AnalysisJob.created_at))
    result = await db.exec(stmt)
    return result.all()
