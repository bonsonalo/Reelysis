#!/usr/bin/env bash
# Free-tier deploy: run Celery worker + API in one Render Web Service.
# Production upgrade: split Celery into a paid Background Worker (scripts/worker.sh) and use
#   uvicorn app.main:app --host 0.0.0.0 --port $PORT
set -euo pipefail

# Free instance has only 512MB RAM.
# Run Celery in a minimal single-process mode (both queues + embedded beat) to avoid OOM restarts.
BEAT_ARGS=()
if [ "${AUTO_SYNC_ENABLED:-true}" != "false" ]; then
  BEAT_ARGS=(--beat --schedule=/tmp/celerybeat-schedule)
fi

celery -A app.core.celery_app worker \
  -Q default,slow \
  --loglevel=info \
  --pool=solo \
  --concurrency=1 \
  --without-gossip \
  --without-mingle \
  --without-heartbeat \
  "${BEAT_ARGS[@]}" &
CELERY_PID=$!

cleanup() {
  kill "$CELERY_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
