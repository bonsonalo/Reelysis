#!/usr/bin/env bash
# Free-tier deploy: run Celery worker + API in one Render Web Service.
# Production upgrade: split Celery into a paid Background Worker and use
#   uvicorn app.main:app --host 0.0.0.0 --port $PORT
set -euo pipefail

# Free instance has only 512MB RAM.
# Run Celery in a minimal single-process mode to avoid OOM restarts.
celery -A app.core.celery_app worker \
  --loglevel=info \
  --pool=solo \
  --concurrency=1 \
  --without-gossip \
  --without-mingle \
  --without-heartbeat &
CELERY_PID=$!

cleanup() {
  kill "$CELERY_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
