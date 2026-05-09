from pydantic import EmailStr
from sqlmodel import SQLModel, Field, Column, Relationship
from uuid import UUID, uuid4
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime, timezone


class User(SQLModel, table= True):
    __tablename__= "users"

    id: UUID= Field(
        sa_column= Column(pg.UUID, 
                          primary_key= True,
                          default= uuid4
                          )
    )
    email: EmailStr = Field(unique= True)
    name: str
    password_hash: str
    created_at: datetime= Field(
        default_factory= lambda: datetime.now(timezone.utc)
        )
    
    external_token: "ExternalToken | None"= Relationship(
        back_populates= "user",
        cascade_delete= True
    )
    auth_sessions: list["AuthSession"]= Relationship(
        back_populates= "user",
        cascade_delete= True
    )
    instagram_account: "InstagramAccount | None"= Relationship(
        back_populates= "user",
        cascade_delete= True
    )
    media_items: list["MediaItem"]= Relationship(
        back_populates= "user",
        cascade_delete= True
    )
    competitor_account: list["CompetitorAccount"]= Relationship(
        back_populates= "user",
        cascade_delete= True
    )
    competitor_media: list["CompetitorMedia"]= Relationship(
        back_populates= "user",
        cascade_delete= True
    )
    video_analysis: list["VideoAnalysis"]= Relationship(
        back_populates= "user",
        cascade_delete= True
    )
    analysis_jobs: list["AnalysisJob"]= Relationship(
        back_populates= "user",
        cascade_delete= True
    )
    account_reports: list["AccountReport"]= Relationship(
        back_populates= "user",
        cascade_delete= True
    )
    recommendations: list["Recommendation"]= Relationship(
        back_populates= "user",
        cascade_delete= True
    )