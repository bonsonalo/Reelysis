import ssl

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import create_engine
from sqlmodel import Session
from app.core.config import settings


def _async_engine_url_and_connect_args(db_url: str) -> tuple[str, dict]:
    """asyncpg rejects sslmode in the URL query; map it to connect_args instead."""
    url = make_url(db_url)
    query = dict(url.query)
    sslmode = query.pop("sslmode", None)
    connect_args: dict = {}
    if sslmode and sslmode.lower() not in ("disable", "allow"):
        connect_args["ssl"] = ssl.create_default_context()
    if sslmode is not None:
        url = url.set(query=query)
    return url.render_as_string(hide_password=False), connect_args


_async_url, _async_connect_args = _async_engine_url_and_connect_args(settings.DB_URL)

# Async engine for FastAPI
engine = create_async_engine(_async_url, connect_args=_async_connect_args)

# Sync engine for Celery tasks
sync_db_url = settings.DB_URL
if sync_db_url.startswith("postgresql+asyncpg://"):
    sync_db_url = sync_db_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
elif sync_db_url.startswith("postgresql+psycopg2://"):
    sync_db_url = sync_db_url.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)
elif sync_db_url.startswith("sqlite://") and not sync_db_url.startswith("sqlite:///"):
    sync_db_url = sync_db_url.replace("sqlite://", "sqlite:///", 1)

sync_engine = create_engine(sync_db_url)

# Async Session for FastAPI
AsyncSessionLocal = async_sessionmaker(
    bind= engine,
    class_= AsyncSession,
    expire_on_commit= False,
    autoflush= False,
    autocommit= False
)

# Sync Session for Celery tasks
SyncSessionLocal = Session(bind=sync_engine)


#get_db()

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


# Import all models to ensure they are registered in SQLModel registry
from app.model.user import User
from app.model.auth import AuthSession
from app.model.external_token import ExternalToken
from app.model.instagram_accounts import InstagramAccount
from app.model.media_items import MediaItem
from app.model.media_metrics import MediaMetric
from app.model.competitor_accounts import CompetitorAccount
from app.model.competitor_media import CompetitorMedia
from app.model.analysis_job import AnalysisJob
from app.model.video_analysis import VideoAnalysis
from app.model.account_report import AccountReport
from app.model.recommendations import Recommendation