from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import create_engine
from sqlmodel import Session
from app.core.config import settings


# Async engine for FastAPI
engine = create_async_engine(settings.DB_URL)

# Sync engine for Celery tasks
sync_engine = create_engine(settings.DB_URL.replace("sqlite://", "sqlite:///").replace("postgresql://", "postgresql+psycopg2://"))

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