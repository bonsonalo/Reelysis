import asyncio
from datetime import datetime, timezone
from uuid import UUID
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import engine
from app.core.logger import logger
from app.core.celery_app import celery_app
from app.api.client.social_data import social_data_client
from app.model.analysis_job import AnalysisJob
from app.model.competitor_accounts import CompetitorAccount
from app.model.instagram_accounts import InstagramAccount

async def discover_competitors_service(user_id: UUID, niche: str, db: AsyncSession):
    """
    Step 1: Creates a discovery job and triggers the external search.
    """
    # 1. Create the tracking job in our DB
    job = AnalysisJob(
        user_id=user_id,
        job_type="competitor_discovery",
        status="queued",
        progress=0,
        input_payload={"niche": niche}
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # 2. Trigger the external search (The Investigator)
    snapshot_id = await social_data_client.search_creators_by_niche(niche)
    
    if not snapshot_id:
        job.status = "failed"
        job.error_message = "Failed to trigger competitor search with provider."
        db.add(job)
        await db.commit()
        return job

    # 3. Store the Tracking ID in input_payload for the worker to find later
    job.input_payload = {"niche": niche, "snapshot_id": snapshot_id}
    job.status = "running"
    db.add(job)
    await db.commit()

    # 4. Kick off the background worker to wait for the results
    celery_app.send_task(
        "app.service.competitor_service.poll_competitor_results_task",
        args=[str(job.id), str(user_id)]
    )

    return job

@celery_app.task(name="app.service.competitor_service.poll_competitor_results_task")
def poll_competitor_results_task(job_id: str, user_id: str):
    """
    Celery task that polls for results.
    """
    return asyncio.run(_poll_results_internal(job_id, user_id))

async def _poll_results_internal(job_id: str, user_id: str):
    async with AsyncSession(engine) as db:
        try:
            job = await db.get(AnalysisJob, UUID(job_id))
            if not job: return

            snapshot_id = job.input_payload.get("snapshot_id")
            
            # Polling loop: Try up to 10 times with a 30s delay
            for attempt in range(10):
                results = await social_data_client.get_snapshot_results(snapshot_id)
                
                if results:
                    # Results are ready! Save them.
                    await _process_and_save_competitors(db, results, UUID(user_id))
                    job.status = "succeeded"
                    job.progress = 100
                    job.completed_at = datetime.now(timezone.utc)
                    await db.commit()
                    return
                
                # Not ready yet, update progress and wait
                job.progress = (attempt + 1) * 9
                await db.commit()
                await asyncio.sleep(30)

            raise Exception("Timed out waiting for competitor data from provider.")

        except Exception as e:
            logger.error(f"Error in competitor discovery task: {e}")
            if job:
                job.status = "failed"
                job.error_message = str(e)
                await db.commit()

async def _process_and_save_competitors(db: AsyncSession, results: list, user_id: UUID):
    """
    Takes the raw list from Bright Data and saves the best ones to our DB.
    """
    # Sort by engagement or followers to pick the best ones
    # (In simulation mode, the list is already small)
    for entry in results[:10]: # Limit to top 10
        competitor = CompetitorAccount(
            user_id=user_id,
            handle=entry.get("handle"),
            display_name=entry.get("display_name"),
            followers_count=entry.get("followers_count", 0),
            media_count=entry.get("media_count", 0),
            engagement_rank=int(entry.get("engagement_rate", 0) * 100),
            last_synced_at=datetime.now(timezone.utc)
        )
        db.add(competitor)
    await db.commit()
