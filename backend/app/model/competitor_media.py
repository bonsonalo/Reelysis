from sqlalchemy import Index


from sqlmodel import SQLModel, Field, Relationship, Column, ForeignKey
import sqlalchemy.dialects.postgresql as pg
from uuid import UUID, uuid4
from datetime import datetime
from typing import Any





class CompetitorMedia(SQLModel, table= True):
    __tablename__= "competitior_media"
    __table_args__ = (
        Index("ix_competitior_media_competitor_account_id", "competitor_account_id"),
        Index("ix_competitior_media_user_id", "user_id"),
    )



    id: UUID= Field(
        default_factory= uuid4,
        sa_column= Column(
            pg.UUID,
            primary_key= True,
        )
    )
    user_id: UUID= Field(
        sa_column=Column(
            pg.UUID,
            ForeignKey("users.id", ondelete= "CASCADE"),
            nullable= False
        )
    )
    competitor_account_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey('competitor_accounts.id', ondelete= "CASCADE"),
            nullable= False
        )
    )
    provider_media_id: str | None= Field(
        default= None,
        sa_column= Column(
            pg.VARCHAR,
            index= True,
        )
    )
    media_type: str
    caption: str
    hashtags: dict[str, Any]= Field(
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
    metrics: dict[str, Any]= Field(
        default= {},
        sa_column= Column(
            pg.JSONB,
        )
    )
    published_at: datetime

    user: "User"= Relationship(
        back_populates= "competitor_media"
    )
    competitor_account: "CompetitorAccount"= Relationship(
        back_populates= "competitor_media"
    )
    video_analysis: list["VideoAnalysis"]= Relationship(
        back_populates= "competitor_media",
        cascade_delete= True
    )
