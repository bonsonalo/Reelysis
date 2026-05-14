



from httpcore import Response
from sqlmodel import select
from app.core.config import settings
from datetime import datetime, timedelta, timezone
import jwt
from uuid import UUID
from app.model.user import User
from app.core.logger import logger
from sqlmodel.ext.asyncio.session import AsyncSession
from app.utils.password_strength import validate_password_strength
from app.schema.auth_schema import LoginInfo, UserCreate
from app.model.user import User
from app.api.dep import authenticate_user, bcrypt_context, create_access_token
from app.model.auth import AuthSession



# sign up

async def register_user(user_info: UserCreate, db: AsyncSession, response: Response):
    try:
        validate_password_strength(user_info.password)
        existing_user= db.scalar(select(User).where(User.email == user_info.email))
        if existing_user:
            raise ValueError("user with email already exists")
    except ValueError as e:
        logger.error(f"Password validation error: {e}")
        raise ValueError(str(e))
    except Exception as e:
        logger.error(f"Error checking existing user: {e}")
        raise Exception("An error occurred while registering the user")
    

    user_credential= User(
        **user_info.model_dump(exclude= {"password"}),
        password_hash= bcrypt_context.hash(user_info.password)
    )
    
    access_token= create_access_token(
        email= user_credential.email,
        id= user_credential.id,
        token_purpose= "access",
        expires_delta= timedelta(minutes= settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token= create_access_token(
        email= user_credential.email,
        id= user_credential.id,
        token_purpose= "refresh",
        expires_delta= timedelta(days= 30)
    )

    refresh_storing= AuthSession(
        user_id= user_credential.id,
        refresh_token_hash= bcrypt_context.hash(refresh_token),
        expires_at= datetime.now(timezone.utc) + timedelta(days= 30)
    )

    response.set_cookie(
        key= "access_token",
        value= access_token,
        httponly= True,
        secure= True,
        samesite= "none",
        max_age= settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key= "refresh_token",
        value= refresh_token,
        httponly= True,
        secure= True,
        samesite= "none",
        max_age= 30 * 24 * 60 * 60
    )




    db.add(user_credential)
    await db.commit()
    await db.refresh(user_credential)

    db.add(refresh_storing)
    await db.commit()
    await db.refresh(refresh_storing)

    return {"message": "User registered successfully"}


# login

async def login_user(user_credential: LoginInfo, db: AsyncSession, response: Response):
        user= await authenticate_user(user_credential, db)
        if not user:
            logger.error("Authentication failed for user")
            raise ValueError("Invalid email or password")
        access_token= create_access_token(
            email= user.email,
            id= user.id,
            token_purpose= "access",
            expires_delta= timedelta(minutes= settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token= create_access_token(
            email= user.email,
            id= user.id,
            token_purpose= "refresh",
            expires_delta= timedelta(days= 30)
        )

        refresh_storing= AuthSession(
            user_id= user.id,
            refresh_token_hash= bcrypt_context.hash(refresh_token),
            expires_at= datetime.now(timezone.utc) + timedelta(days= 30)
        )
        response.set_cookie(
            key= "access_token",
            value= access_token,
            httponly= True,
            secure= True,
            samesite= "none",
            max_age= settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        response.set_cookie(
            key= "refresh_token",
            value= refresh_token,
            httponly= True,
            secure= True,
            samesite= "none",
            max_age= 30 * 24 * 60 * 60
        )

        db.add(refresh_storing)
        await db.commit()
        await db.refresh(refresh_storing)
        