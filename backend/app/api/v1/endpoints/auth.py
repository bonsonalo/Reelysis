from fastapi import HTTPException, APIRouter, Request, Response
from app.schema.auth_schema import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    ForgotPasswordRequest,
    LoginInfo,
    ResetPasswordRequest,
    UserCreate,
    VerifyEmailRequest,
)
from app.api.dep import db_dependency, user_authentication_dependency
from app.core.cookies import clear_auth_cookies
from app.core.logger import logger
from app.core.rate_limit import (
    auth_email_limit,
    auth_login_limit,
    auth_refresh_limit,
    auth_signup_limit,
    get_ip_key,
    get_user_key,
    limiter,
)
from app.service.auth_service import (
    change_password_service,
    delete_account_service,
    forgot_password_service,
    login_user,
    logout_service,
    profile_service,
    refresh_token_service,
    register_user,
    resend_verification_service,
    reset_password_service,
    verify_email_service,
)
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
        logger.info("Signup rejected: %s", e)
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
        logger.info("Login rejected: %s", e)
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
        logger.info("Refresh rejected: %s", e)
        raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, detail= "Invalid refresh token")

@router.post("/logout")
async def logout(request: Request, response: Response, db: db_dependency):
    return await logout_service(response, db, request)

@router.get("/profile")
async def profile(current_user: user_authentication_dependency, db: db_dependency):
    try:
        return await profile_service(current_user, db)
    except ValueError as e:
        raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, detail= str(e))


@router.post("/password/forgot")
@limiter.limit(auth_email_limit, key_func=get_ip_key)
async def forgot_password(request: Request, body: ForgotPasswordRequest, db: db_dependency):
    return await forgot_password_service(body.email, db)


@router.post("/password/reset")
@limiter.limit(auth_login_limit, key_func=get_ip_key)
async def reset_password(request: Request, body: ResetPasswordRequest, response: Response, db: db_dependency):
    try:
        result = await reset_password_service(body.token, body.password, db)
        # Sessions are revoked server-side; also drop this browser's still-valid access cookie.
        clear_auth_cookies(response)
        return result
    except ValueError as e:
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail= str(e))


@router.post("/password/change")
@limiter.limit(auth_login_limit, key_func=get_user_key)
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    response: Response,
    current_user: user_authentication_dependency,
    db: db_dependency,
):
    try:
        return await change_password_service(
            current_user, body.current_password, body.new_password, db, response
        )
    except ValueError as e:
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail= str(e))


@router.post("/email/verify")
@limiter.limit(auth_login_limit, key_func=get_ip_key)
async def verify_email(request: Request, body: VerifyEmailRequest, db: db_dependency):
    try:
        return await verify_email_service(body.token, db)
    except ValueError as e:
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail= str(e))


@router.post("/email/resend")
@limiter.limit(auth_email_limit, key_func=get_user_key)
async def resend_verification(
    request: Request,
    current_user: user_authentication_dependency,
    db: db_dependency,
):
    try:
        return await resend_verification_service(current_user, db)
    except ValueError as e:
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail= str(e))


@router.delete("/account")
@limiter.limit(auth_login_limit, key_func=get_user_key)
async def delete_account(
    request: Request,
    body: DeleteAccountRequest,
    response: Response,
    current_user: user_authentication_dependency,
    db: db_dependency,
):
    try:
        return await delete_account_service(current_user, body.password, db, response)
    except ValueError as e:
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail= str(e))
