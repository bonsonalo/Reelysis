from fastapi import HTTPException, APIRouter, Response
from app.schema.auth_schema import UserCreate, LoginInfo
from app.api.dep import authenticate_user, db_dependency
from app.core.logger import logger
from app.service.auth_service import login_user, register_user
from starlette import status


router= APIRouter(
    prefix="/api/v1/auth", 
    tags=["auth"]
    )



#sign up

@router.post("/signup")
async def signup(user_credential: UserCreate, db: db_dependency, res: Response):
    try:
        return await register_user(user_credential, db, res)
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail= str(e))

@router.post("/login")
async def login(user_info: LoginInfo, db: db_dependency, res: Response):
    try:
        return await login_user(user_info, db, res)
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, detail= str(e))
    
