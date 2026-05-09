from sqlmodel import SQLModel, Field, Relationship, Field, Column, ForeignKey
import sqlalchemy.dialects.postgresql as pg
from uuid import UUID, uuid4




class Recommendation(SQLModel, table= True):
    __tablename__= "recommendations"

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
    account_report_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey("account_reports.id", ondelete= "CASCADE"),
            nullable= False
        )
    )
    recommedation_type: str
    title: str
    description: str
    priority: int
    evidence: str
    status: str


    user: "User"= Relationship(
        back_populates= "recommendations"
    )
    account_report: "AccountReport"= Relationship(
        back_populates= "recommendations"
    )