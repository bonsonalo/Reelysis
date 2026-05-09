from sqlmodel import SQLModel, Field, Relationship, Column, ForeignKey
import sqlalchemy.dialects.postgresql as pg
from uuid import UUID, uuid4
from datetime import datetime, timezone




class MediaItem(SQLModel, table= True):
    __tablename__= "media_items"


    id: UUID = Field(
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
    external_media_id: str
    media_type: str
    caption: str
    hashtag: pg.JSONB
    permalink: str
    thumbnail_url= str
    transcript_text: str
    transcript_source: str
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