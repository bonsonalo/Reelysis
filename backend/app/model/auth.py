from sqlmodel import SQLModel, Field, Column, ForeignKey
from uuid import UUID, uuid4
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime, timezone




class AuthSession(SQLModel, table= True):
    __tablename__= "auth_sessions"



    id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            primary_key= True,
            default= uuid4
        )
    )
    user_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey("users.id", ondelete= "CASCADE"),
            nullable= False
        )
    )
    refresh_token_hash: str
    expires_at: datetime= Field(
        default_factory= lambda: datetime.now(timezone.utc),
        nullable= False
    )
    revoked_at: datetime | None = Field(default=None)
