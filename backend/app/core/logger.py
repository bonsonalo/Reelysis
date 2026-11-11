import logging
import os

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(level=LOG_LEVEL)
logger= logging.getLogger(__name__)
# Explicit level: Alembic's fileConfig (run on API startup) resets the root logger to WARNING.
logger.setLevel(LOG_LEVEL)
