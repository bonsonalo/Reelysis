#!/usr/bin/env bash
# Celery worker for Render.
# - Background Worker: Celery only (no HTTP port needed).
# - Web Service (free-tier hack): bind a tiny health server on $PORT so deploy completes.
set -euo pipefail

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

if [ -n "${PORT:-}" ]; then
  # Render Web Services require an open HTTP port; Celery does not expose one.
  exec python -m http.server "$PORT" --bind 0.0.0.0
fi

wait "$CELERY_PID"
