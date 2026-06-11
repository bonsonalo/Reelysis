import asyncio
from datetime import datetime, timezone
from uuid import UUID, uuid4
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import engine
from app.core.logger import logger
from app.core.celery_app import celery_app
from app.api.client.social_data import social_data_client
from app.model.analysis_job import AnalysisJob
from app.model.competitor_accounts import CompetitorAccount
from app.model.competitor_media import CompetitorMedia
from app.model.instagram_accounts import InstagramAccount
from app.service.video_analysis_service import run_bulk_video_analysis_service

# MVP Configuration Constants
MAX_COMPETITORS_TO_STORE = 10
MAX_COMPETITORS_TO_ANALYZE = 5
MAX_VIDEOS_PER_COMPETITOR = 5

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
    Celery task that polls for discovery results, then fetches media.
    """
    return asyncio.run(_poll_results_internal(job_id, user_id))

async def _poll_results_internal(job_id: str, user_id: str):
    async with AsyncSession(engine) as db:
        try:
            job = await db.get(AnalysisJob, UUID(job_id))
            if not job: return

            snapshot_id = job.input_payload.get("snapshot_id")
            
            # STAGE 1: Wait for Discovery results (Profiles)
            results = None
            for attempt in range(10):
                results = await social_data_client.get_snapshot_results(snapshot_id)
                if results: break
                
                # Update progress and wait
                job.progress = (attempt + 1) * 5
                await db.commit()
                await asyncio.sleep(30)

            if not results:
                raise Exception("Timed out waiting for competitor discovery data from provider.")

            # STAGE 2: Save discovered accounts
            competitor_ids = await _process_and_save_competitors(db, results, UUID(user_id))
            job.progress = 50
            await db.commit()

            # STAGE 3: Fetch Media for the Top X Competitors
            logger.info(f"Fetching media for top {MAX_COMPETITORS_TO_ANALYZE} competitors...")
            await _fetch_all_competitor_media(db, competitor_ids[:MAX_COMPETITORS_TO_ANALYZE], UUID(user_id))

            # STAGE 4: Finalize Job and Trigger Video Analysis
            job.status = "succeeded"
            job.progress = 100
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()
            
            # Automatically move to the next phase: Analyzing the videos
            logger.info(f"Triggering bulk video analysis for user {user_id}")
            await run_bulk_video_analysis_service(UUID(user_id), db)

        except Exception as e:
            logger.error(f"Error in competitor discovery task: {e}")
            if job:
                job.status = "failed"
                job.error_message = str(e)
                await db.commit()

async def _process_and_save_competitors(db: AsyncSession, results: list, user_id: UUID):
    """
    Takes the raw list of creators from Bright Data and saves the best ones to our DB.
    Returns a list of the UUIDs for the saved competitors.
    """
    saved_ids = []
    for entry in results[:MAX_COMPETITORS_TO_STORE]:
        competitor = CompetitorAccount(
            user_id=user_id,
            handle=entry.get("handle"),
            display_name=entry.get("display_name"),
            profile_picture_url=entry.get("profile_picture_url"),
            followers_count=entry.get("followers_count", 0),
            media_count=entry.get("media_count", 0),
            engagement_rank=int(entry.get("engagement_rate", 0) * 100),
            last_synced_at=datetime.now(timezone.utc)
        )
        db.add(competitor)
        await db.flush() # Flushes to DB to generate the UUID without committing yet
        saved_ids.append(competitor.id)
        
    await db.commit()
    return saved_ids

async def _fetch_all_competitor_media(db: AsyncSession, competitor_ids: list[UUID], user_id: UUID):
    """
    Triggers media fetch for each competitor and waits for results.
    """
    snapshots = []
    # 1. Trigger all media fetch jobs (Hire investigators for all handles)
    for comp_id in competitor_ids:
        competitor = await db.get(CompetitorAccount, comp_id)
        snapshot_id = await social_data_client.get_creator_media(competitor.handle)
        if snapshot_id:
            snapshots.append({"comp_id": comp_id, "snapshot_id": snapshot_id})

    # 2. Wait and poll until all are finished or we timeout
    for _ in range(10):
        remaining = []
        for s in snapshots:
            media_results = await social_data_client.get_snapshot_results(s["snapshot_id"])
            if media_results:
                # Pickup the data and save it
                await _save_competitor_media(db, s["comp_id"], user_id, media_results)
            else:
                remaining.append(s)
        
        snapshots = remaining
        if not snapshots: break # All finished!
        await asyncio.sleep(30)

async def _save_competitor_media(db: AsyncSession, competitor_id: UUID, user_id: UUID, results: list):
    """
    Saves the list of videos for a specific competitor.
    """
    for entry in results[:MAX_VIDEOS_PER_COMPETITOR]:
        media = CompetitorMedia(
            user_id=user_id,
            competitor_account_id=competitor_id,
            # Generate a provider_media_id if one doesn't exist
            provider_media_id=UUID(str(uuid4())) if not entry.get("id") else None,
            media_type=entry.get("media_type", "VIDEO"),
            caption=entry.get("caption", ""),
            hashtags={"names": entry.get("hashtags", [])},
            permalink=entry.get("permalink", ""),
            thumbnail_url=entry.get("thumbnail_url", ""),
            audio_url="", 
            transcript_text="", 
            transcript_source="none",
            metrics=entry.get("metrics", {}),
            published_at=datetime.now(timezone.utc)
        )
        db.add(media)
    await db.commit()
