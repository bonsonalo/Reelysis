from sqlmodel import SQLModel, Field, Column, ForeignKey, Relationship
from uuid import UUID, uuid4
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime, timezone, timedelta


class ExternalToken(SQLModel, table= True):
    __tablename__= "external_tokens"


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
    encrypted_access_token: str
    encrypted_refresh_token: str
    expires_at: datetime
    scopes: pg.JSONB


    user: "User"= Relationship(
        back_populates= "external_token"
    )