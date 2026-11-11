#!/usr/bin/env bash
# Celery for Render.
# - Two solo workers: "default" (sync, discovery, reports) and "slow" (transcription, reel scrapes),
#   so a long transcription batch can't block a user's report. Beat (daily sync + token refresh)
#   is embedded in the default worker. Set WORKER_MODE=single to run one worker for both queues
#   (lower memory, but long tasks block short ones again).
# - Web Service (free-tier hack): bind a tiny health server on $PORT so deploy completes.
set -euo pipefail

COMMON_ARGS=(--loglevel=info --pool=solo --concurrency=1 --without-gossip --without-mingle --without-heartbeat)
BEAT_ARGS=()
if [ "${AUTO_SYNC_ENABLED:-true}" != "false" ]; then
  BEAT_ARGS=(--beat --schedule=/tmp/celerybeat-schedule)
fi

PIDS=()
if [ "${WORKER_MODE:-split}" = "single" ]; then
  celery -A app.core.celery_app worker -Q default,slow -n worker@%h "${COMMON_ARGS[@]}" "${BEAT_ARGS[@]}" &
  PIDS+=($!)
else
  celery -A app.core.celery_app worker -Q default -n default@%h "${COMMON_ARGS[@]}" "${BEAT_ARGS[@]}" &
  PIDS+=($!)
  celery -A app.core.celery_app worker -Q slow -n slow@%h "${COMMON_ARGS[@]}" &
  PIDS+=($!)
fi

cleanup() {
  kill "${PIDS[@]}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if [ -n "${PORT:-}" ]; then
  # Render Web Services require an open HTTP port; Celery does not expose one. Serve an empty
  # directory: http.server lists its working directory, which would publish the source tree.
  HEALTH_DIR=$(mktemp -d)
  echo ok > "$HEALTH_DIR/index.html"
  exec python -m http.server "$PORT" --bind 0.0.0.0 --directory "$HEALTH_DIR"
fi

# Exit (and let the platform restart us) as soon as either worker dies.
wait -n "${PIDS[@]}"
