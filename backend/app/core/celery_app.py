from celery import Celery
from celery.schedules import crontab
from app.core.config import settings


# broker: The "Order Rail" (Redis) where messages are sent
# backend: The low-level technical result store (also Redis)
celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.service.instagram_service",
        "app.service.competitor_service",
        "app.service.transcript_service",
        "app.service.video_analysis_service",
        "app.service.report_service",
        "app.service.scheduled_service",
    ]
)

DEFAULT_QUEUE = "default"
# Minutes-long work (AssemblyAI polling, Bright Data reel scrapes) gets its own queue so it
# never sits in front of user-facing jobs like sync, discovery and reports.
SLOW_QUEUE = "slow"


celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # Max 1 hour per task
    worker_prefetch_multiplier=1, # One task at a time per worker for better progress tracking
    task_default_queue=DEFAULT_QUEUE,
    task_routes={
        "app.service.transcript_service.run_transcription_task": {"queue": SLOW_QUEUE},
        "app.service.competitor_service.fetch_competitor_media_task": {"queue": SLOW_QUEUE},
        "app.service.competitor_service.fetch_competitor_media_batch_task": {"queue": SLOW_QUEUE},
        "app.service.competitor_service.refresh_competitor_profile_task": {"queue": SLOW_QUEUE},
    },
    beat_schedule={
        "enqueue-daily-instagram-syncs": {
            "task": "app.service.scheduled_service.enqueue_due_syncs_task",
            "schedule": crontab(minute=15),  # hourly; only accounts due for a sync are queued
        },
        "refresh-expiring-instagram-tokens": {
            "task": "app.service.scheduled_service.refresh_expiring_tokens_task",
            "schedule": crontab(hour=3, minute=0),
        },
    },
)
