from sqlmodel import Field, SQLModel, Column, ForeignKey, Relationship
from enum import Enum
from uuid import UUID, uuid4
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime
from typing import Any

class MediaSource(str, Enum):
    OWN= "own"
    COMPETITOR= "competitor"


class VideoAnalysis(SQLModel, table= True):
    __tablename__= "video_analysis"


    id: UUID= Field(
        default_factory= uuid4,
        sa_column= Column(
            pg.UUID,
            primary_key= True,
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
    topic: str
    category: str
    content_pillar: str
    confidence: int
    hook_score: int
    engagement_score: int
    analysis_detail: dict[str, Any]= Field(
        default= {},
        sa_column= Column(
            pg.JSONB,
        )
    )
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