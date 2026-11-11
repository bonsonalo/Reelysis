from dataclasses import dataclass
from app.utils.time import utc_now
from typing import Callable, Optional
from uuid import UUID

from sqlmodel import Session, select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm.exc import StaleDataError

from app.core.celery_app import celery_app
from app.core.client.assemblyai import assemblyai_client
from app.core.config import settings
from app.core.database import sync_engine
from app.core.logger import logger
from app.model.analysis_job import AnalysisJob
from app.model.competitor_media import CompetitorMedia
from app.model.media_items import MediaItem
from app.service.job_utils import job_should_start, mark_failed, mark_running, mark_succeeded, set_progress

TRANSCRIBABLE_MEDIA_TYPES = {"REEL", "VIDEO", "reel", "video"}


@dataclass
class TranscriptResult:
    text: str
    source: str
    confidence: Optional[float] = None


def _is_transcribable(media_type: str) -> bool:
    return (media_type or "").upper() in {t.upper() for t in TRANSCRIBABLE_MEDIA_TYPES}


def _simulate_transcript(caption: str) -> TranscriptResult:
    snippet = (caption or "").strip()
    if snippet:
        text = f"[Simulated speech] {snippet}"
    else:
        text = "[Simulated speech] Sample spoken content for this Reel."
    return TranscriptResult(text=text, source="simulation", confidence=0.85)


def transcribe_media_url(audio_url: str, caption: str = "") -> TranscriptResult:
    """
    Transcribe a remote media URL via AssemblyAI, or return a simulation transcript.
    """
    if settings.AI_SIMULATION_MODE:
        logger.info("AI Simulation Mode: Mocking transcription")
        return _simulate_transcript(caption)

    if not audio_url:
        return TranscriptResult(text="", source="none")

    if not settings.ASSEMBLYAI_API_KEY:
        logger.warning("No ASSEMBLYAI_API_KEY configured; skipping remote transcription.")
        return TranscriptResult(text="", source="none")

    try:
        result = assemblyai_client.transcribe_remote_url(audio_url)
        text = result.get("text", "").strip()
        if not text:
            return TranscriptResult(text="", source="none")
        return TranscriptResult(
            text=text,
            source="assemblyai",
            confidence=result.get("confidence"),
        )
    except Exception as e:
        message = str(e).lower()
        if "no spoken audio" in message or "language_detection cannot be performed" in message:
            logger.info("No spoken audio in media; will analyze from captions and metrics only.")
        else:
            logger.warning("Transcription failed for URL: %s", e)
        return TranscriptResult(text="", source="none")


def _needs_transcription(transcript_text: str, transcript_source: str) -> bool:
    if transcript_source == "simulation":
        return True
    if transcript_text and transcript_source not in ("", "none"):
        return False
    return True


def _collect_transcription_targets(db: Session, user_id: UUID) -> list[tuple[str, UUID]]:
    """
    Returns (kind, id) pairs sorted URL-first: own media, then competitor media.
    kind is 'own' or 'competitor'.
    """
    own_stmt = select(MediaItem).where(MediaItem.user_id == user_id)
    own_items = [
        item for item in db.exec(own_stmt).all()
        if _is_transcribable(item.media_type) and _needs_transcription(item.transcript_text, item.transcript_source)
    ]

    comp_stmt = select(CompetitorMedia).where(CompetitorMedia.user_id == user_id)
    comp_items = [
        item for item in db.exec(comp_stmt).all()
        if _is_transcribable(item.media_type) and _needs_transcription(item.transcript_text, item.transcript_source)
    ]

    targets: list[tuple[str, UUID, bool]] = []
    for item in own_items:
        targets.append(("own", item.id, bool(item.audio_url)))
    for item in comp_items:
        targets.append(("competitor", item.id, bool(item.audio_url)))

    targets.sort(key=lambda row: 0 if row[2] else 1)
    return [(kind, item_id) for kind, item_id, _ in targets]


def _apply_transcript_to_item(item, caption: str) -> None:
    audio_url = getattr(item, "audio_url", "") or ""
    if settings.AI_SIMULATION_MODE and not audio_url:
        simulated = _simulate_transcript(caption)
        item.transcript_text = simulated.text
        item.transcript_source = simulated.source
        return

    if not audio_url:
        item.transcript_source = "none"
        return

    result = transcribe_media_url(audio_url, caption)
    item.transcript_text = result.text
    item.transcript_source = result.source if result.text else "none"


async def run_bulk_transcription_service(user_id: UUID, db: AsyncSession) -> AnalysisJob:
    job = AnalysisJob(
        user_id=user_id,
        job_type="transcription",
        status="queued",
        progress=0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    celery_app.send_task(
        "app.service.transcript_service.run_transcription_task",
        args=[str(job.id), str(user_id)],
    )
    return job


def run_transcription_sync(user_id: UUID, on_item: Callable[[], None] | None = None) -> None:
    """Run pending transcriptions inline (no Celery, no video-analysis enqueue). on_item = heartbeat."""
    with Session(sync_engine) as db:
        targets = _collect_transcription_targets(db, user_id)
        for kind, item_id in targets:
            if on_item:
                on_item()
            try:
                if kind == "own":
                    item = db.exec(select(MediaItem).where(MediaItem.id == item_id)).first()
                else:
                    item = db.exec(
                        select(CompetitorMedia).where(CompetitorMedia.id == item_id)
                    ).first()
                if not item:
                    continue
                _apply_transcript_to_item(item, item.caption)
                db.add(item)
                db.commit()
            except StaleDataError:
                db.rollback()
                logger.warning("Skipping stale %s media %s during sync transcription", kind, item_id)


def enqueue_transcription_for_user(db: Session, user_id: UUID) -> AnalysisJob:
    """Sync helper for Celery workers that already hold a Session."""
    job = AnalysisJob(
        user_id=user_id,
        job_type="transcription",
        status="queued",
        progress=0,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    celery_app.send_task(
        "app.service.transcript_service.run_transcription_task",
        args=[str(job.id), str(user_id)],
    )
    return job


@celery_app.task(name="app.service.transcript_service.run_transcription_task")
def run_transcription_task(job_id: str, user_id: str):
    return _run_transcription_internal(job_id, user_id)


def _run_transcription_internal(job_id: str, user_id: str):
    try:
        job_uuid = UUID(job_id)
        user_uuid = UUID(user_id)
    except Exception as e:
        logger.error(f"Invalid transcription task arguments: {e}")
        return

    with Session(sync_engine) as db:
        job = db.get(AnalysisJob, job_uuid)
        if not job_should_start(job):
            return

        try:
            mark_running(job)
            db.commit()

            targets = _collect_transcription_targets(db, user_uuid)
            total = len(targets)

            if total == 0:
                mark_succeeded(job)
                db.commit()
                logger.info(
                    "Transcription complete for user %s; video analysis deferred to report generation.",
                    user_uuid,
                )
                return

            for index, (kind, item_id) in enumerate(targets):
                try:
                    if kind == "own":
                        item = db.exec(select(MediaItem).where(MediaItem.id == item_id)).first()
                    else:
                        item = db.exec(
                            select(CompetitorMedia).where(CompetitorMedia.id == item_id)
                        ).first()

                    if not item:
                        logger.info(
                            "Skipping transcription for deleted %s media %s",
                            kind,
                            item_id,
                        )
                        continue

                    _apply_transcript_to_item(item, item.caption)
                    db.add(item)
                    set_progress(job, int(((index + 1) / total) * 100))
                    db.commit()
                except StaleDataError:
                    db.rollback()
                    logger.warning(
                        "Skipping stale %s media %s (row removed during rediscover)",
                        kind,
                        item_id,
                    )
                    continue

            mark_succeeded(job)
            db.commit()

            logger.info(
                "Transcription complete for user %s; video analysis deferred to report generation.",
                user_uuid,
            )

        except Exception as e:
            db.rollback()
            logger.exception(f"Error in transcription task: {e}")
            job = db.get(AnalysisJob, job_uuid)
            if job:
                mark_failed(job, str(e))
                db.commit()
