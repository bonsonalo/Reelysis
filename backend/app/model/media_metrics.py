from sqlmodel import SQLModel, Field, Column, Relationship, ForeignKey
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime, timezone
from uuid import UUID, uuid4





class MediaMetric(SQLModel, table= True):
    __tablename__= "media_metrics"


    id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            primary_key= True,
            server_default= uuid4
        )
    )
    media_item_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey("media_items.id", ondelete= "CASCADE"),
            nullable= False
        )
    )
    view: int
    reach: int
    likes: int
    comments: str
    saves: int
    shares: int
    total_interactions: int
    raw_metrics: pg.JSONB
    captured_at: datetime


    user: "User" = Relationship(
        back_populates= ""
    )

    media_item: "MediaItem"= Relationship(
        back_populates= "metrics"
    )

