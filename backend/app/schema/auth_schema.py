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

class ForgotPasswordRequest(SQLModel):
    email: EmailStr

class ResetPasswordRequest(SQLModel):
    token: str
    password: str

class ChangePasswordRequest(SQLModel):
    current_password: str
    new_password: str

class VerifyEmailRequest(SQLModel):
    token: str

class DeleteAccountRequest(SQLModel):
    password: str
