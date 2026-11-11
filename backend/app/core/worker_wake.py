"""
Keep a sleeping Celery worker reachable. On Render's free plan the worker is a Web Service that
spins down after 15 minutes without HTTP traffic; queued jobs don't wake it. So the publisher
pings it when a job is queued, and the worker pings itself while a job is running.
"""

import threading
import time

import httpx
from celery.signals import after_task_publish, task_postrun, task_prerun, worker_ready

from app.core.config import settings
from app.core.logger import logger

# Well under Render's 15-minute idle window, so one ping covers a burst of jobs.
PING_INTERVAL_SECONDS = 300
BUSY_CHECK_SECONDS = 60
# A cold start takes ~30-60s before the worker answers.
PING_TIMEOUT_SECONDS = 90

_lock = threading.Lock()
_last_ping = 0.0
_active_tasks = 0


def _ping(url: str) -> None:
    try:
        httpx.get(url, timeout=PING_TIMEOUT_SECONDS)
    except Exception as e:
        logger.warning("Worker wake ping failed: %s", e)


def ping_worker() -> bool:
    """Ping the worker in the background, at most once per interval. Returns True if sent."""
    global _last_ping
    url = settings.WORKER_WAKE_URL.strip()
    if not url:
        return False
    with _lock:
        now = time.monotonic()
        if _last_ping and now - _last_ping < PING_INTERVAL_SECONDS:
            return False
        _last_ping = now
    threading.Thread(target=_ping, args=(url,), daemon=True).start()
    return True


def keep_awake_tick() -> bool:
    """One check of the worker's keep-awake loop: ping while any task is running."""
    with _lock:
        busy = _active_tasks > 0
    return ping_worker() if busy else False


def _keep_awake_loop() -> None:
    while True:
        time.sleep(BUSY_CHECK_SECONDS)
        keep_awake_tick()


@after_task_publish.connect
def _wake_on_publish(**_):
    ping_worker()


@task_prerun.connect
def _task_started(**_):
    global _active_tasks
    with _lock:
        _active_tasks += 1


@task_postrun.connect
def _task_finished(**_):
    global _active_tasks
    with _lock:
        _active_tasks = max(0, _active_tasks - 1)


@worker_ready.connect
def _start_keep_awake(**_):
    if settings.WORKER_WAKE_URL.strip():
        threading.Thread(target=_keep_awake_loop, daemon=True).start()
