from fastapi import HTTPException

from app.core.logger import logger


def internal_error(context: str) -> HTTPException:
    """Log the active exception with its traceback and return a generic 500 (no internals leaked)."""
    logger.exception("Unhandled error: %s", context)
    return HTTPException(status_code=500, detail="Something went wrong. Please try again.")
