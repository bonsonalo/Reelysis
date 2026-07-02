#!/usr/bin/env python3
"""
One-time reset: clear simulated AI artifacts, then re-run the full real pipeline
(Meta sync -> AssemblyAI transcription -> Gemini video analysis).

Requirements:
  - AI_SIMULATION_MODE=false in backend/.env
  - GEMINI_API_KEY and ASSEMBLYAI_API_KEY set
  - Celery worker running

Usage (from backend/):
  ./instaenv/bin/python scripts/real_mode_resync.py
  ./instaenv/bin/python scripts/real_mode_resync.py --user-id <uuid>
  ./instaenv/bin/python scripts/real_mode_resync.py --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path
from uuid import UUID

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, sync_engine
from app.model.competitor_media import CompetitorMedia
from app.model.instagram_accounts import InstagramAccount
from app.model.media_items import MediaItem
from app.model.video_analysis import VideoAnalysis
from app.service.instagram_service import trigger_instagram_sync_service


def _is_simulated_transcript(transcript_text: str, transcript_source: str) -> bool:
    if transcript_source == "simulation":
        return True
    return (transcript_text or "").strip().startswith("[Simulated speech]")


def reset_simulated_ai_data(db: Session, user_id: UUID | None = None) -> dict[str, int]:
    """Remove simulated transcripts and all video analysis so pipelines re-run."""
    counts = {"transcripts_cleared": 0, "video_analysis_deleted": 0}

    media_stmt = select(MediaItem)
    if user_id:
        media_stmt = media_stmt.where(MediaItem.user_id == user_id)
    for item in db.exec(media_stmt).all():
        if _is_simulated_transcript(item.transcript_text, item.transcript_source):
            item.transcript_text = ""
            item.transcript_source = "none"
            db.add(item)
            counts["transcripts_cleared"] += 1

    comp_stmt = select(CompetitorMedia)
    if user_id:
        comp_stmt = comp_stmt.where(CompetitorMedia.user_id == user_id)
    for item in db.exec(comp_stmt).all():
        if _is_simulated_transcript(item.transcript_text, item.transcript_source):
            item.transcript_text = ""
            item.transcript_source = "none"
            db.add(item)
            counts["transcripts_cleared"] += 1

    analysis_stmt = select(VideoAnalysis)
    if user_id:
        analysis_stmt = analysis_stmt.where(VideoAnalysis.user_id == user_id)
    for analysis in db.exec(analysis_stmt).all():
        db.delete(analysis)
        counts["video_analysis_deleted"] += 1

    db.commit()
    return counts


def get_connected_user_ids(db: Session, user_id: UUID | None = None) -> list[UUID]:
    stmt = select(InstagramAccount.user_id)
    if user_id:
        stmt = stmt.where(InstagramAccount.user_id == user_id)
    return list(db.exec(stmt).all())


async def trigger_sync_for_users(user_ids: list[UUID]) -> list[UUID]:
    job_ids: list[UUID] = []
    async with AsyncSessionLocal() as db:
        for uid in user_ids:
            job = await trigger_instagram_sync_service(uid, db)
            job_ids.append(job.id)
            print(f"  Queued instagram_sync job {job.id} for user {uid}")
    return job_ids


def main() -> int:
    parser = argparse.ArgumentParser(description="Reset simulated AI data and re-run real sync pipeline.")
    parser.add_argument("--user-id", type=str, help="Only reset/re-sync this user (UUID)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be reset without changing data")
    args = parser.parse_args()

    if settings.AI_SIMULATION_MODE:
        print("ERROR: AI_SIMULATION_MODE is true. Set AI_SIMULATION_MODE=false in backend/.env first.")
        return 1

    if not settings.GEMINI_API_KEY:
        print("WARNING: GEMINI_API_KEY is not set. Video analysis will not run.")

    if not settings.ASSEMBLYAI_API_KEY:
        print("WARNING: ASSEMBLYAI_API_KEY is not set. Transcription may be skipped.")

    user_id = UUID(args.user_id) if args.user_id else None

    with Session(sync_engine) as db:
        user_ids = get_connected_user_ids(db, user_id)
        if not user_ids:
            print("No connected Instagram accounts found.")
            return 1

        if args.dry_run:
            counts = {"transcripts_cleared": 0, "video_analysis_deleted": 0}
            media_stmt = select(MediaItem)
            if user_id:
                media_stmt = media_stmt.where(MediaItem.user_id == user_id)
            for item in db.exec(media_stmt).all():
                if _is_simulated_transcript(item.transcript_text, item.transcript_source):
                    counts["transcripts_cleared"] += 1

            comp_stmt = select(CompetitorMedia)
            if user_id:
                comp_stmt = comp_stmt.where(CompetitorMedia.user_id == user_id)
            for item in db.exec(comp_stmt).all():
                if _is_simulated_transcript(item.transcript_text, item.transcript_source):
                    counts["transcripts_cleared"] += 1

            analysis_stmt = select(VideoAnalysis)
            if user_id:
                analysis_stmt = analysis_stmt.where(VideoAnalysis.user_id == user_id)
            counts["video_analysis_deleted"] = len(db.exec(analysis_stmt).all())

            print(f"Dry run for {len(user_ids)} user(s):")
            print(f"  Simulated transcripts to clear: {counts['transcripts_cleared']}")
            print(f"  Video analysis rows to delete: {counts['video_analysis_deleted']}")
            print(f"  Instagram sync jobs to queue: {len(user_ids)}")
            return 0

        print(f"Resetting simulated AI data for {len(user_ids)} user(s)...")
        total = {"transcripts_cleared": 0, "video_analysis_deleted": 0}
        if user_id:
            merged = reset_simulated_ai_data(db, user_id)
            for key in total:
                total[key] += merged[key]
        else:
            for uid in user_ids:
                merged = reset_simulated_ai_data(db, uid)
                for key in total:
                    total[key] += merged[key]

        print(f"  Cleared {total['transcripts_cleared']} simulated transcript(s)")
        print(f"  Deleted {total['video_analysis_deleted']} video analysis row(s)")

    print("Queueing fresh Instagram sync (Meta -> transcription -> video analysis)...")
    print("Make sure Celery is running: celery -A app.core.celery_app worker --loglevel=info")
    asyncio.run(trigger_sync_for_users(user_ids))
    print("Done. Watch Celery logs for sync, transcription, and Gemini analysis.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
