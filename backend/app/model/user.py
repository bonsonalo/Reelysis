from pydantic import EmailStr
from sqlmodel import SQLModel, Field, Column
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