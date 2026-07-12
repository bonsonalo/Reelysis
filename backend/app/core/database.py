import ssl

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import create_engine
from sqlmodel import Session

from app.core.config import settings
from app.core.db_url import (
    build_async_engine_url_and_connect_args,
    build_sync_engine_url_and_connect_args,
)

_async_url, _async_connect_args, _via_pooler = build_async_engine_url_and_connect_args(
    settings.DB_URL,
)

if _via_pooler:
    engine = create_async_engine(
        _async_url,
        connect_args=_async_connect_args,
        poolclass=NullPool,
    )
else:
    engine = create_async_engine(
        _async_url,
        connect_args=_async_connect_args,
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,
    )

sync_db_url, sync_connect_args = build_sync_engine_url_and_connect_args(settings.DB_URL)

sync_engine = create_engine(
    sync_db_url,
    connect_args=sync_connect_args,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

SyncSessionLocal = Session(bind=sync_engine)


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


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
