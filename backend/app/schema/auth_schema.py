from pydantic import EmailStr
from sqlmodel import SQLModel
from uuid import UUID

class BaseInfo(SQLModel):
    name: str
    email: EmailStr

class LoginInfo(SQLModel):
    email: EmailStr
    password: str

class UserCreate(BaseInfo):
    password: str

class UserRead(BaseInfo):
    id: UUID