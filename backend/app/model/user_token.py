from sqlmodel import SQLModel, Field, Column, ForeignKey, Relationship
from uuid import UUID, uuid4
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime

from app.utils.time import utc_now


class UserToken(SQLModel, table= True):
    """Single-use emailed tokens (password reset, email verification). Only a SHA-256 hash is stored."""
    __tablename__= "user_tokens"

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
            nullable= False,
            index= True,
        )
    )
    purpose: str
    token_hash: str = Field(index= True)
    expires_at: datetime
    used_at: datetime | None = Field(default=None)
    created_at: datetime= Field(default_factory=utc_now)

    user: "User"= Relationship(
        back_populates= "user_tokens"
    )
