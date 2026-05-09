from sqlmodel import  Field, SQLModel, Fiedl, Column, ForeignKey, Relationship
from uuid import UUID, uuid4
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime

from backend.app.model.competitor_media import CompetitorMedia




class VideoAnalysis(SQLModel, table= True):
    __tablename__= "video_analysis"


    id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            primary_key= True,
            server_default= uuid4
        )
    )
    competitor_media_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey("competitior_media.id", ondelete= "CASCADE"),
            nullable= False
        )
    )
    analysis_provider: str
    analysis_result: pg.JSONB
    analyzed_at: datetime


    competitor_media: "CompetitorMedia"= Relationship(
        back_populates= "video_analysis"
    )