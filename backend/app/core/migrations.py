from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.logger import logger

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def run_migrations() -> None:
    """Apply Alembic migrations up to head."""
    ini_path = BACKEND_ROOT / "alembic.ini"
    if not ini_path.is_file():
        raise FileNotFoundError(f"Alembic config not found: {ini_path}")

    logger.info("Running Alembic migrations (upgrade head)...")
    cfg = Config(str(ini_path))
    command.upgrade(cfg, "head")
    logger.info("Alembic migrations complete.")
