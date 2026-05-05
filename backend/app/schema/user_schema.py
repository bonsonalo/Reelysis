from pydantic import EmailStr
from sqlmodel import SQLModel
from uuid import UUID

class UserBase(SQLModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: UUID