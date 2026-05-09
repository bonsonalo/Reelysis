


from sqlmodel import Column, ForeignKey, SQLModel, Field, Relationship
import sqlalchemy.dialects.postgresql as pg
from uuid import UUID, uuid4
from datetime import datetime, timezone





class AnalysisJob(SQLModel, table= True):
    __tavlename__= "analysis_jobs"



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
    job_type: str
    status: str
    progress: int
    input_payload: pg.JSONB
    result_payload: pg.JSONB
    error_message: str
    retry_count: int
    started_at: datetime
    completed_at: datetime
    created_at: datetime= Field(
        default_factory= lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime= Field(
        default_factory= lambda: datetime.now(timezone.utc),
        sa_column= Column(
            onupdate= lambda: datetime.now(timezone.utc)
        )
    )

    user: "User"= Relationship(
        back_populates= "analysis_jobs"
    )

