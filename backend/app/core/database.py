from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.config import settings


#engine

engine= create_async_engine(settings.DB_URL)

#Session

AsyncSessionLocal= async_sessionmaker(
    bind= engine,
    class_= AsyncSession,
    expire_on_commit= False,
    autoflush= False,
    autocommit= False
)


#get_db()

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db