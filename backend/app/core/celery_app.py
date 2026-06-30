from celery import Celery
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
        "app.service.report_service"
    ]
)


celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # Max 1 hour per task
    worker_prefetch_multiplier=1, # One task at a time per worker for better progress tracking
)
