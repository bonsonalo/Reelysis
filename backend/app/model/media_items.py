from sqlalchemy import Index
from sqlmodel import SQLModel, Field, Relationship, Column, ForeignKey
import sqlalchemy.dialects.postgresql as pg
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import Any




class MediaItem(SQLModel, table= True):
    __tablename__= "media_items"
    __table_args__ = (
        Index("ix_media_items_user_id_published_at", "user_id", "published_at"),
        Index("ix_media_items_user_id_external_media_id", "user_id", "external_media_id"),
    )


    id: UUID = Field(
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
    external_media_id: str
    media_type: str
    caption: str
    hashtag: dict[str, Any]= Field(
        default= {},
        sa_column= Column(
            pg.JSONB,
        )
    )
    permalink: str
    thumbnail_url: str
    audio_url: str = Field(default="")
    transcript_text: str = Field(default="")
    transcript_source: str = Field(default="none")
    published_at: datetime



    user: "User" = Relationship(
        back_populates= "media_items"
    )
    metrics: list["MediaMetric"] = Relationship(
        back_populates= "media_item",
        cascade_delete= True
    )
    video_analysis: list["VideoAnalysis"]= Relationship(
        back_populates= "media_item",
        cascade_delete= True
    )
