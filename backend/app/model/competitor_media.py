

from sqlmodel import SQLModel, Field, Relationship, Column, ForeignKey
import sqlalchemy.dialects.postgresql as pg
from uuid import UUID, uuid4
from datetime import datetime
from typing import Any





class CompetitorMedia(SQLModel, table= True):
    __tablename__= "competitior_media"



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
    provider_media_id: UUID= Field(
        sa_column= Column(
            pg.UUID
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
    audio_url: str
    transcript_text: str
    transcript_source: str
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
