import asyncio
import hashlib
import hmac
import secrets
from datetime import timedelta
from uuid import UUID

from fastapi import Request, Response
from sqlmodel import delete, select, update
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.dep import bcrypt_context, create_access_token, decode_token
from app.core.config import settings
from app.core.cookies import clear_auth_cookies, set_auth_cookies
from app.core.email import send_password_reset_email, send_verification_email
from app.core.logger import logger
from app.model.auth import AuthSession
from app.model.user import User
from app.model.user_token import UserToken
from app.schema.auth_schema import LoginInfo, UserCreate
from app.utils.password_strength import validate_password_strength
from app.utils.time import utc_now

REFRESH_TOKEN_DAYS = 30
REFRESH_REUSE_GRACE_SECONDS = 30
TOKEN_PURPOSE_PASSWORD_RESET = "password_reset"
TOKEN_PURPOSE_EMAIL_VERIFY = "email_verify"
FORGOT_PASSWORD_MESSAGE = "If an account exists for that email, a reset link has been sent."


def hash_token(token: str) -> str:
    """SHA-256 for high-entropy tokens. (bcrypt only reads 72 bytes, which is less than a JWT's shared prefix.)"""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def hash_password(password: str) -> str:
    return await asyncio.to_thread(bcrypt_context.hash, password)


async def verify_password(password: str, password_hash: str) -> bool:
    return await asyncio.to_thread(bcrypt_context.verify, password, password_hash)


def user_payload(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "email_verified": user.email_verified_at is not None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


async def _issue_session(user: User, db: AsyncSession, response: Response) -> None:
    """Create a refresh session row, embed its id (sid) in the refresh JWT, and set both cookies."""
    session = AuthSession(
        user_id=user.id,
        refresh_token_hash="",
        expires_at=utc_now() + timedelta(days=REFRESH_TOKEN_DAYS),
    )
    access_token = await create_access_token(
        email=user.email,
        id=user.id,
        token_purpose="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = await create_access_token(
        email=user.email,
        id=user.id,
        token_purpose="refresh",
        expires_delta=timedelta(days=REFRESH_TOKEN_DAYS),
        extra_claims={"sid": str(session.id)},
    )
    session.refresh_token_hash = hash_token(refresh_token)
    db.add(session)
    await db.commit()
    set_auth_cookies(response, access_token, refresh_token)


async def _revoke_all_sessions(user_id: UUID, db: AsyncSession, *, except_id: UUID | None = None) -> None:
    stmt = (
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at == None)  # noqa: E711
        .values(revoked_at=utc_now())
    )
    if except_id is not None:
        stmt = stmt.where(AuthSession.id != except_id)
    await db.exec(stmt)


async def _create_user_token(user_id: UUID, purpose: str, ttl: timedelta, db: AsyncSession) -> str:
    """Invalidate earlier unused tokens for this purpose and return a fresh raw token."""
    await db.exec(
        update(UserToken)
        .where(
            UserToken.user_id == user_id,
            UserToken.purpose == purpose,
            UserToken.used_at == None,  # noqa: E711
        )
        .values(used_at=utc_now())
    )
    raw = secrets.token_urlsafe(32)
    db.add(
        UserToken(
            user_id=user_id,
            purpose=purpose,
            token_hash=hash_token(raw),
            expires_at=utc_now() + ttl,
        )
    )
    await db.commit()
    return raw


async def _consume_user_token(raw: str, purpose: str, db: AsyncSession) -> UserToken:
    stmt = select(UserToken).where(
        UserToken.token_hash == hash_token(raw or ""),
        UserToken.purpose == purpose,
    )
    record = (await db.exec(stmt)).first()
    if not record or record.used_at is not None or record.expires_at <= utc_now():
        raise ValueError("This link is invalid or has expired. Please request a new one.")
    record.used_at = utc_now()
    db.add(record)
    return record


async def _send_verification(user: User, db: AsyncSession) -> None:
    token = await _create_user_token(
        user.id,
        TOKEN_PURPOSE_EMAIL_VERIFY,
        timedelta(hours=settings.EMAIL_VERIFY_TOKEN_HOURS),
        db,
    )
    await asyncio.to_thread(send_verification_email, user.email, user.name, token)


# sign up

async def register_user(user_info: UserCreate, db: AsyncSession, response: Response):
    validate_password_strength(user_info.password)
    existing_user = (await db.exec(select(User).where(User.email == user_info.email))).first()
    if existing_user:
        raise ValueError("user with email already exists")

    user = User(
        **user_info.model_dump(exclude={"password"}),
        password_hash=await hash_password(user_info.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _issue_session(user, db, response)
    try:
        await _send_verification(user, db)
    except Exception as e:
        logger.error("Could not send verification email for user %s: %s", user.id, e)

    return user_payload(user)


# login

async def login_user(user_credential: LoginInfo, db: AsyncSession, response: Response):
    user = (await db.exec(select(User).where(User.email == user_credential.email))).first()
    if not user or not await verify_password(user_credential.password, user.password_hash):
        raise ValueError("Invalid email or password")

    await _issue_session(user, db, response)
    return user_payload(user)


async def refresh_token_service(response: Response, db: AsyncSession, request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise ValueError("Refresh token missing")

    payload = decode_token(refresh_token, "refresh")
    user_id: UUID = payload["id"]
    try:
        session_id = UUID(payload.get("sid") or "")
    except ValueError:
        raise ValueError("Invalid refresh token")

    session = await db.get(AuthSession, session_id)
    if not session or session.user_id != user_id:
        raise ValueError("Invalid refresh token")

    if not hmac.compare_digest(session.refresh_token_hash, hash_token(refresh_token)):
        raise ValueError("Invalid refresh token")

    if session.revoked_at is not None:
        # A rotated-out token was replayed. Within a short grace window it is most likely two tabs
        # refreshing at once; after that, assume theft and end every session for this user.
        if (utc_now() - session.revoked_at).total_seconds() > REFRESH_REUSE_GRACE_SECONDS:
            logger.warning("Refresh token reuse detected for user %s; revoking all sessions", user_id)
            await _revoke_all_sessions(user_id, db)
            await db.commit()
        raise ValueError("Invalid refresh token")

    if session.expires_at <= utc_now():
        raise ValueError("Refresh token expired")

    user = await db.get(User, user_id)
    if not user:
        raise ValueError("Invalid refresh token")

    session.revoked_at = utc_now()
    db.add(session)
    await _issue_session(user, db, response)
    return {"message": "Token refreshed"}


async def logout_service(response: Response, db: AsyncSession, request: Request):
    """Revoke the session behind this browser's refresh cookie (if valid) and clear cookies."""
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            payload = decode_token(refresh_token, "refresh")
            session = await db.get(AuthSession, UUID(payload.get("sid") or ""))
            if session and session.user_id == payload["id"] and session.revoked_at is None:
                session.revoked_at = utc_now()
                db.add(session)
                await db.commit()
        except ValueError:
            pass
    clear_auth_cookies(response)
    return {"message": "Logged out"}


async def _get_user(user_id: UUID, db: AsyncSession) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    return user


async def profile_service(current_user, db: AsyncSession):
    user = await _get_user(current_user["id"], db)
    return user_payload(user)


async def forgot_password_service(email: str, db: AsyncSession):
    user = (await db.exec(select(User).where(User.email == email))).first()
    if user:
        token = await _create_user_token(
            user.id,
            TOKEN_PURPOSE_PASSWORD_RESET,
            timedelta(minutes=settings.PASSWORD_RESET_TOKEN_MINUTES),
            db,
        )
        await asyncio.to_thread(send_password_reset_email, user.email, user.name, token)
    return {"message": FORGOT_PASSWORD_MESSAGE}


async def reset_password_service(token: str, new_password: str, db: AsyncSession):
    validate_password_strength(new_password)
    record = await _consume_user_token(token, TOKEN_PURPOSE_PASSWORD_RESET, db)
    user = await _get_user(record.user_id, db)
    user.password_hash = await hash_password(new_password)
    # Receiving the email proves the user owns the inbox.
    if user.email_verified_at is None:
        user.email_verified_at = utc_now()
    db.add(user)
    await _revoke_all_sessions(user.id, db)
    await db.commit()
    return {"message": "Password updated. Please log in with your new password."}


async def change_password_service(
    current_user: dict,
    current_password: str,
    new_password: str,
    db: AsyncSession,
    response: Response,
):
    user = await _get_user(current_user["id"], db)
    if not await verify_password(current_password, user.password_hash):
        raise ValueError("Current password is incorrect.")
    validate_password_strength(new_password)
    user.password_hash = await hash_password(new_password)
    db.add(user)
    await _revoke_all_sessions(user.id, db)
    await db.commit()
    await _issue_session(user, db, response)
    return {"message": "Password changed. Other devices have been signed out."}


async def verify_email_service(token: str, db: AsyncSession):
    record = await _consume_user_token(token, TOKEN_PURPOSE_EMAIL_VERIFY, db)
    user = await _get_user(record.user_id, db)
    if user.email_verified_at is None:
        user.email_verified_at = utc_now()
        db.add(user)
    await db.commit()
    return {"message": "Email verified.", "email_verified": True}


async def resend_verification_service(current_user: dict, db: AsyncSession):
    user = await _get_user(current_user["id"], db)
    if user.email_verified_at is not None:
        raise ValueError("Email is already verified.")
    await _send_verification(user, db)
    return {"message": "Verification email sent."}


async def delete_account_service(current_user: dict, password: str, db: AsyncSession, response: Response):
    user = await _get_user(current_user["id"], db)
    if not await verify_password(password, user.password_hash):
        raise ValueError("Password is incorrect.")
    # Every user-owned table has ON DELETE CASCADE to users.id.
    await db.exec(delete(User).where(User.id == user.id))
    await db.commit()
    clear_auth_cookies(response)
    return {"message": "Account deleted."}
