from sqlalchemy import Index



from sqlmodel import Column, ForeignKey, SQLModel, Field, Relationship
import sqlalchemy.dialects.postgresql as pg
from uuid import UUID, uuid4
from datetime import datetime

from app.utils.time import utc_epoch, utc_now
from typing import Any





class AnalysisJob(SQLModel, table= True):
    __tablename__= "analysis_jobs"
    __table_args__ = (
        Index("ix_analysis_jobs_user_id_job_type_created_at", "user_id", "job_type", "created_at"),
    )



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
    job_type: str
    status: str
    progress: int
    input_payload: dict[str, Any]= Field(
        default= {},
        sa_column= Column(
            pg.JSONB,
        )
    )
    result_payload: dict[str, Any]= Field(
        default= {},
        sa_column= Column(
            pg.JSONB,
        )
    )
    error_message: str = Field(default="")
    retry_count: int = Field(default=0)
    started_at: datetime = Field(default_factory=utc_epoch)
    completed_at: datetime = Field(default_factory=utc_epoch)
    created_at: datetime= Field(
        default_factory=utc_now
    )
    updated_at: datetime= Field(
        default_factory=utc_now,
        sa_column= Column(
            onupdate=utc_now
        )
    )

    user: "User"= Relationship(
        back_populates= "analysis_jobs"
    )
