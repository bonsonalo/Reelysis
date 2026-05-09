from sqlmodel import  Enum, Field, SQLModel, Fiedl, Column, ForeignKey, Relationship
from uuid import UUID, uuid4
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime

from backend.app.model.competitor_media import CompetitorMedia


class MediaSource(str, Enum):
    OWN= "own"
    COMPETITOR= "competitor"


class VideoAnalysis(SQLModel, table= True):
    __tablename__= "video_analysis"


    id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            primary_key= True,
            server_default= uuid4
        )
    )
    user_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey("users.id", ondelete= "CASCADE"),
            nullable= False
        )
    )
    media_source: MediaSource
    media_item_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey("media_items.id", ondelete= "CASCADE"),
            nullable= True
        )
    )
    competitor_media_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey("competitior_media.id", ondelete= "CASCADE"),
            nullable= True
        )
    )
    topics: str
    category: str
    content_pillar: str
    confidence: int
    hook_score: int
    engagement_score: int
    analysis_detail: pg.JSONB
    created_at: datetime


    competitor_media: "CompetitorMedia"= Relationship(
        back_populates= "video_analysis"
    )
    user: "User"= Relationship(
        back_populates= "video_analysis"
    )
    media_item: "MediaItem"= Relationship(
        back_populates= "video_analysis"
    )