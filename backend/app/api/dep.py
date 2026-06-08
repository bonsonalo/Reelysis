from jose import JWTError
from passlib.context import CryptContext
from pydantic import EmailStr
from sqlmodel import select
from app.schema.auth_schema import LoginInfo
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import Annotated
from fastapi import Depends, HTTPException, Request
import uuid
from app.core.config import settings
from datetime import datetime, timedelta, timezone
import jwt
from uuid import UUID   
from app.model.user import User
from app.core.logger import logger
from app.core.database import get_db


bcrypt_context= CryptContext(schemes=["bcrypt"], deprecated="auto")



async def authenticate_user(user_credential: LoginInfo, db: AsyncSession):
    try:
        user= await db.scalar(select(User).where(User.email == user_credential.email))
        if not user:
            return False
        if not bcrypt_context.verify(user_credential.password, user.password_hash):
            return False
        return user
    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        raise ValueError("Authentication failed")


async def create_access_token(email: EmailStr, id: uuid.UUID, token_purpose: str, expires_delta: timedelta):
    try:
        encode= {
            "sub": email,
            "id": str(id),
            "token_type": token_purpose
        }

        expire= datetime.now(timezone.utc) + expires_delta
        encode.update({"exp": expire})


        return jwt.encode(encode, settings.SECRET_KEY, algorithm= settings.ALGORITHM)

    except Exception as e:
        logger.error(f"Error creating access token: {e}")
        raise ValueError("Token creation failed")
    


db_dependency= Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(request: Request):
        token= request.cookies.get("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        try:
            payload= jwt.decode(token, settings.SECRET_KEY, algorithms= [settings.ALGORITHM])
            email: str= payload.get("sub")
            id: UUID= UUID(payload.get("id"))
            token_type: str= payload.get("token_type")

            if email is None or id is None or token_type != "access":
                logger.error("Invalid token payload")
                raise HTTPException(status_code=401, detail="Invalid token")
            return {"email": email, "id": id}
        except JWTError as e:
            logger.error(f"JWT decode error: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        

user_authentication_dependency= Annotated[dict, Depends(get_current_user)]