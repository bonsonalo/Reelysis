#!/usr/bin/env bash
# Free-tier deploy: run Celery worker + API in one Render Web Service.
# Production upgrade: split Celery into a paid Background Worker and use
#   uvicorn app.main:app --host 0.0.0.0 --port $PORT
set -euo pipefail

celery -A app.core.celery_app worker --loglevel=info &
CELERY_PID=$!

cleanup() {
  kill "$CELERY_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
