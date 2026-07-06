#!/usr/bin/env python3
"""Run Alembic migrations. Use as a Render/Railway pre-deploy command from backend/."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.migrations import run_migrations  # noqa: E402


def main() -> int:
    run_migrations()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
