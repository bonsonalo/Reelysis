from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.api.client.meta import meta_client
from app.core.redis import redis_client
from app.model.instagram_accounts import InstagramAccount
from app.core.logger import logger
from app.model.external_token import ExternalToken
from cryptography.fernet import Fernet
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from uuid import UUID

fernet= Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())


# This service function will be responsible for generating the Instagram OAuth URL and storing the state parameter in Redis with an expiration time.
async def get_oauth_url_service(user_id: UUID):
    try:
        oauth_data= meta_client.get_oauth_url()
        redis_client.setex(f"oauth_state:{oauth_data['state']}", 600, str(user_id))
        return oauth_data['url']
    except Exception as e:
        logger.error(f"Error generating OAuth URL: {e}")
        raise ValueError("Failed to generate OAuth URL")
    

# for handling the callback and token exchange, we will implement a service function that will be called from the endpoint handler. 
# This function will handle the logic of exchanging the code for an access token, encrypting it, and storing it in the database along with the Instagram account information.
async def handle_oauth_callback_service(code: str, state: str, db: AsyncSession):
    try:
        user_id_raw= redis_client.get(f"oauth_state:{state}")
        if not user_id_raw:
            raise ValueError("Invalid or expired state parameter")
        
        user_id = UUID(user_id_raw.decode() if isinstance(user_id_raw, bytes) else user_id_raw)
        redis_client.delete(f"oauth_state:{state}")
        
        token_data= await meta_client.exchange_code_for_access_token(code)
        short_lived_token= token_data.get("access_token")
        if not short_lived_token:
            raise ValueError("Failed to obtain access token")
            
        long_lived_token_data= await meta_client.exchange_for_long_lived_token(short_lived_token)
        long_lived_token= long_lived_token_data.get("access_token")
        if not long_lived_token:
            raise ValueError("Failed to obtain long-lived access token")
            
        encrypted_token= fernet.encrypt(long_lived_token.encode()).decode()
        instagram_account_data= await meta_client.get_instagram_account(long_lived_token)      
        
        # Check for existing account
        existing_account_stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
        existing_account = (await db.exec(existing_account_stmt)).first()
        
        if existing_account:
            existing_account.instagram_user_id = instagram_account_data["id"]
            existing_account.username = instagram_account_data["username"]
            existing_account.account_type = instagram_account_data["account_type"]
            existing_account.profile_picture_url = instagram_account_data.get("profile_picture_url")
            existing_account.biography = instagram_account_data.get("biography")
            existing_account.followers_count = instagram_account_data.get("followers_count", 0)
            existing_account.media_count = instagram_account_data.get("media_count", 0)
            db.add(existing_account)
        else:
            instagram_account= InstagramAccount(
                instagram_user_id= instagram_account_data["id"],
                username= instagram_account_data["username"],
                account_type= instagram_account_data["account_type"],
                profile_picture_url= instagram_account_data.get("profile_picture_url"),
                biography= instagram_account_data.get("biography"),
                followers_count= instagram_account_data.get("followers_count", 0),
                media_count= instagram_account_data.get("media_count", 0),
                user_id= user_id,
            )  
            db.add(instagram_account)
            
        # Check for existing token
        existing_token_stmt = select(ExternalToken).where(ExternalToken.user_id == user_id)
        existing_token = (await db.exec(existing_token_stmt)).first()
        
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=long_lived_token_data.get("expires_in", 5184000)) # Default 60 days
        
        if existing_token:
            existing_token.encrypted_access_token = encrypted_token
            existing_token.expires_at = expires_at
            db.add(existing_token)
        else:
            external_token= ExternalToken(
                user_id= user_id,
                encrypted_access_token= encrypted_token,
                expires_at= expires_at,
                scopes= ["instagram_business_basic", "instagram_business_manage_insights"]
            )
            db.add(external_token)
            
        await db.commit()
        return True
    except Exception as e:
        logger.error(f"Error handling OAuth callback: {e}")
        raise ValueError(f"Failed to handle OAuth callback: {str(e)}")

async def get_connected_accounts_service(user_id: UUID, db: AsyncSession):
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
    result = await db.exec(stmt)
    return result.all()

async def disconnect_instagram_service(user_id: UUID, db: AsyncSession):
    # Delete token
    token_stmt = select(ExternalToken).where(ExternalToken.user_id == user_id)
    token = (await db.exec(token_stmt)).first()
    if token:
        await db.delete(token)
        
    # Delete account
    account_stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
    account = (await db.exec(account_stmt)).first()
    if account:
        await db.delete(account)
        
    await db.commit()
    return True
