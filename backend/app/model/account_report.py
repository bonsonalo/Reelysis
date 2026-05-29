from sqlmodel import SQLModel, Field, Relationship, Column, ForeignKey
import sqlalchemy.dialects.postgresql as pg
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import Any





class AccountReport(SQLModel, table= True):
    __tablename__= "account_reports"


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
    title: str
    status: str
    summary: str
    report_json: dict[str, Any]= Field(
        default= {},
        sa_column= Column(
            pg.JSONB,
        )
    )
    report_markdown: str
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
        back_populates= "account_reports"
    )
    recommendations: list["Recommendation"]= Relationship(
        back_populates= "account_report",
        cascade_delete= True
    )