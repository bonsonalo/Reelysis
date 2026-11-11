from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.v1.routes import routers
from app.core.config import settings
from app.core.logger import logger
from app.core.middleware import OriginCheckMiddleware
from app.core.migrations import run_migrations
from app.core.rate_limit import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.RUN_MIGRATIONS_ON_STARTUP:
        try:
            run_migrations()
        except Exception:
            logger.exception("Database migration failed on startup")
            raise
    yield


app = FastAPI(title="Reelysis", lifespan=lifespan)

app.state.limiter = limiter


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait and try again."},
        headers=getattr(exc, "headers", None) or {},
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(OriginCheckMiddleware)
# Added last so it runs first: CORS headers are also present on the CSRF 403.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routers)
