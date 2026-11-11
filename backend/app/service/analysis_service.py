from sqlmodel.ext.asyncio.session import AsyncSession
from uuid import UUID
from fastapi import HTTPException
from app.model.analysis_job import AnalysisJob
from sqlmodel import select, desc
from typing import Optional
from app.service.instagram_service import reconcile_instagram_sync_job
from app.service.competitor_service import reconcile_competitor_discovery_job
from app.service.report_service import reconcile_report_generation_job
from app.service.job_utils import ACTIVE_STATUSES, reconcile_generic_job

RECONCILERS = {
    "instagram_sync": reconcile_instagram_sync_job,
    "competitor_discovery": reconcile_competitor_discovery_job,
    "report_generation": reconcile_report_generation_job,
}


async def _reconcile(job: AnalysisJob, db: AsyncSession) -> AnalysisJob:
    if job.status not in ACTIVE_STATUSES:
        return job
    reconcile_fn = RECONCILERS.get(job.job_type, reconcile_generic_job)
    return await reconcile_fn(job, db)


async def get_job_status_service(job_id: UUID, user_id: UUID, db: AsyncSession):

    # Business logic for retrieving a job status.
    # Validates existence and ownership.

    job = await db.get(AnalysisJob, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this job")

    return await _reconcile(job, db)

async def get_user_jobs_service(
    user_id: UUID,
    job_type: Optional[str],
    db: AsyncSession,
    limit: Optional[int] = None,
):
    """
    Retrieves background jobs for a specific user, optionally filtered by type.
    Active jobs are reconciled so a dead worker never leaves a job "running" forever.
    """
    stmt = select(AnalysisJob).where(AnalysisJob.user_id == user_id)
    if job_type:
        stmt = stmt.where(AnalysisJob.job_type == job_type)

    stmt = stmt.order_by(desc(AnalysisJob.created_at))
    if limit is not None:
        stmt = stmt.limit(limit)
    jobs = (await db.exec(stmt)).all()

    return [await _reconcile(job, db) for job in jobs]
