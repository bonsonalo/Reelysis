from sqlmodel.ext.asyncio.session import AsyncSession
from uuid import UUID
from fastapi import HTTPException
from app.model.analysis_job import AnalysisJob

async def get_job_status_service(job_id: UUID, user_id: UUID, db: AsyncSession):

    # Business logic for retrieving a job status.
    # Validates existence and ownership.

    job = await db.get(AnalysisJob, job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this job")
        
    return job
