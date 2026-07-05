from fastapi import HTTPException, APIRouter, Request, Response
from app.schema.auth_schema import UserCreate, LoginInfo
from app.api.dep import db_dependency, user_authentication_dependency
from app.core.logger import logger
from app.core.rate_limit import (
    auth_login_limit,
    auth_refresh_limit,
    auth_signup_limit,
    get_ip_key,
    limiter,
)
from app.service.auth_service import login_user, logout_service, profile_service, refresh_token_service, register_user
from starlette import status


router= APIRouter(
    prefix="/api/v1/auth", 
    tags=["auth"]
    )



#sign up

@router.post("/signup")
@limiter.limit(auth_signup_limit, key_func=get_ip_key)
async def signup(
    request: Request,
    user_credential: UserCreate,
    db: db_dependency,
    response: Response,
):
    try:
        return await register_user(user_credential, db, response)
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail= str(e))

@router.post("/login")
@limiter.limit(auth_login_limit, key_func=get_ip_key)
async def login(
    request: Request,
    user_info: LoginInfo,
    db: db_dependency,
    response: Response,
):
    try:
        return await login_user(user_info, db, response)
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, detail= str(e))
    
@router.post("/refresh")
@limiter.limit(auth_refresh_limit, key_func=get_ip_key)
async def refresh_token(
    request: Request,
    response: Response,
    db: db_dependency,
):
    try:
        return await refresh_token_service(response, db, request)
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, detail= str(e))

@router.post("/logout")
async def logout(response: Response, db: db_dependency, current_user: user_authentication_dependency):
    try:
        return await logout_service(response, db, current_user)
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail= str(e))
    
@router.get("/profile")
async def profile(current_user: user_authentication_dependency, db: db_dependency):
    try:
        return await profile_service(current_user, db)
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, detail= str(e))