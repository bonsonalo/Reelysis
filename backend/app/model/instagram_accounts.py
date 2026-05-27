from sqlmodel import SQLModel, Field, ForeignKey, Column, Relationship
from uuid import UUID, uuid4
import sqlalchemy.dialects.postgresql as pg
from enum import Enum
from datetime import datetime


class AccountType(str, Enum):
    BUSINESS= "BUSINESS"
    CREATOR= "CREATOR"


class InstagramAccount(SQLModel, table= True):
    __tablename__= "instagram_accounts"


    id: UUID= Field(
        default_factory= uuid4,
        sa_column= Column(
            pg.UUID,
            primary_key= True
        )
    )
    user_id: UUID= Field(
        sa_column= Column(
            pg.UUID,
            ForeignKey("users.id", ondelete= "CASCADE"),
            nullable= False
        )
    )
    instagram_user_id: str
    username: str
    account_type: AccountType
    profile_picture_url: str | None = Field(default=None)
    biography: str | None = Field(default=None)
    niche_detected: str | None= Field(default= None)
    niche_confirmed: str | None= Field(default= None)
    followers_count: int
    media_count: int
    last_synced_at: datetime | None = Field(default= None)


    user: "User" = Relationship(
        back_populates= "instagram_account"
    )
