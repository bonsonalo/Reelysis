#!/usr/bin/env bash
# Paid Render Background Worker: Celery only (512MB Starter — keep memory low).
set -euo pipefail

exec celery -A app.core.celery_app worker \
  --loglevel=info \
  --pool=solo \
  --concurrency=1 \
  --without-gossip \
  --without-mingle \
  --without-heartbeat
