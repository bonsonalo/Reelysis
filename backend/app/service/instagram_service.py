import asyncio
import redis
from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from app.core.config import settings
from app.api.client.meta import meta_client
from app.core.redis import redis_client
from app.model.instagram_accounts import InstagramAccount
from app.core.logger import logger
from app.model.external_token import ExternalToken
from app.model.analysis_job import AnalysisJob
from app.model.media_items import MediaItem
from app.model.media_metrics import MediaMetric
from app.core.celery_app import celery_app
from app.core.database import engine
from app.service.ai_service import detect_niche_service
from app.service.competitor_service import discover_competitors_service

from cryptography.fernet import Fernet
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

fernet = Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())

async def get_oauth_url_service(user_id: UUID):
    try:
        oauth_data = meta_client.get_oauth_url()
        
        if not meta_client.app_id or meta_client.app_id == "None":
             logger.error("Meta App ID is missing or invalid")
             raise ValueError("Meta API configuration is missing")

        redis_client.setex(f"oauth_state:{oauth_data['state']}", 600, str(user_id))
        return oauth_data['url']
    except redis.exceptions.ConnectionError as e:
        logger.error(f"Redis connection failed: {e}")
        raise ValueError("Temporary storage connection failed")
    except Exception as e:
        logger.error(f"Error generating OAuth URL: {e}")
        raise ValueError(str(e))

async def handle_oauth_callback_service(code: str, state: str, db: AsyncSession):
    try:
        user_id_raw = redis_client.get(f"oauth_state:{state}")
        if not user_id_raw:
            raise ValueError("Invalid or expired state parameter")
        
        user_id = UUID(user_id_raw.decode() if isinstance(user_id_raw, bytes) else user_id_raw)
        redis_client.delete(f"oauth_state:{state}")
        
        token_data = await meta_client.exchange_code_for_access_token(code)
        short_lived_token = token_data.get("access_token")
        if not short_lived_token:
            raise ValueError("Failed to obtain access token")
            
        long_lived_token_data = await meta_client.exchange_for_long_lived_token(short_lived_token)
        long_lived_token = long_lived_token_data.get("access_token")
        if not long_lived_token:
            raise ValueError("Failed to obtain long-lived access token")
            
        encrypted_token = fernet.encrypt(long_lived_token.encode()).decode()
        instagram_account_data = await meta_client.get_instagram_account(long_lived_token)      
        
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
            instagram_account = InstagramAccount(
                instagram_user_id=instagram_account_data["id"],
                username=instagram_account_data["username"],
                account_type=instagram_account_data["account_type"],
                profile_picture_url=instagram_account_data.get("profile_picture_url"),
                biography=instagram_account_data.get("biography"),
                followers_count=instagram_account_data.get("followers_count", 0),
                media_count=instagram_account_data.get("media_count", 0),
                user_id=user_id,
            )  
            db.add(instagram_account)
            
        existing_token_stmt = select(ExternalToken).where(ExternalToken.user_id == user_id)
        existing_token = (await db.exec(existing_token_stmt)).first()
        
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=long_lived_token_data.get("expires_in", 5184000))
        
        if existing_token:
            existing_token.encrypted_access_token = encrypted_token
            existing_token.expires_at = expires_at
            db.add(existing_token)
        else:
            external_token = ExternalToken(
                user_id=user_id,
                encrypted_access_token=encrypted_token,
                expires_at=expires_at,
                scopes=["instagram_business_basic", "instagram_business_manage_insights"]
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
    token_stmt = select(ExternalToken).where(ExternalToken.user_id == user_id)
    token = (await db.exec(token_stmt)).first()
    if token:
        await db.delete(token)
        
    account_stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
    account = (await db.exec(account_stmt)).first()
    if account:
        await db.delete(account)
        
    await db.commit()
    return True

async def trigger_instagram_sync_service(user_id: UUID, db: AsyncSession):
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
    account = (await db.exec(stmt)).first()
    if not account:
        raise ValueError("No Instagram account connected.")

    new_job = AnalysisJob(
        user_id=user_id,
        job_type="instagram_sync",
        status="queued",
        progress=0
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    celery_app.send_task(
        "app.service.instagram_service.sync_instagram_data_task",
        args=[str(new_job.id), str(user_id)]
    )

    return new_job

async def confirm_instagram_niche_service(user_id: UUID, niche: str, db: AsyncSession):
    """
    Saves the user-confirmed niche to the database and triggers competitor discovery.
    """
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
    account = (await db.exec(stmt)).first()
    if not account:
        raise ValueError("Instagram account not found.")
    
    account.niche_confirmed = niche
    db.add(account)
    await db.commit()
    await db.refresh(account)

    # Automatically trigger competitor discovery
    await discover_competitors_service(user_id, niche, db)
    
    return account

@celery_app.task(name="app.service.instagram_service.sync_instagram_data_task")
def sync_instagram_data_task(job_id: str, user_id: str):
    """
    Background task to sync Instagram data.
    """
    return asyncio.run(_sync_instagram_data_internal(job_id, user_id))

async def _sync_instagram_data_internal(job_id: str, user_id: str):
    async with AsyncSession(engine) as db:
        try:
            job = await db.get(AnalysisJob, UUID(job_id))
            if not job:
                return
            job.status = "running"
            job.started_at = datetime.now(timezone.utc)
            await db.commit()

            token_stmt = select(ExternalToken).where(ExternalToken.user_id == UUID(user_id))
            token_record = (await db.exec(token_stmt)).first()
            if not token_record:
                raise ValueError("Token not found")

            decrypted_token = fernet.decrypt(token_record.encrypted_access_token.encode()).decode()

            acc_stmt = select(InstagramAccount).where(InstagramAccount.user_id == UUID(user_id))
            account = (await db.exec(acc_stmt)).first()
            ig_user_id = account.instagram_user_id

            media_data = await meta_client.get_user_media(ig_user_id, decrypted_token)
            items = media_data.get("data", [])
            total_items = len(items)
            
            all_captions = []

            for index, item in enumerate(items):
                insights = await meta_client.get_media_insights(item["id"], decrypted_token)
                
                existing_media_stmt = select(MediaItem).where(MediaItem.external_media_id == item["id"])
                media_item = (await db.exec(existing_media_stmt)).first()

                caption = item.get("caption", "")
                all_captions.append(caption)

                if not media_item:
                    media_item = MediaItem(
                        user_id=UUID(user_id),
                        external_media_id=item["id"],
                        media_type=item["media_type"],
                        caption=caption,
                        permalink=item["permalink"],
                        thumbnail_url=item.get("thumbnail_url") or item.get("media_url"),
                        published_at=datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00")),
                    )
                    db.add(media_item)
                    await db.commit()
                    await db.refresh(media_item)
                
                metric_data = {m["name"]: m["values"][0]["value"] for m in insights.get("data", [])}
                
                media_metric = MediaMetric(
                    media_item_id=media_item.id,
                    view=metric_data.get("plays", 0),
                    reach=metric_data.get("reach", 0),
                    likes=metric_data.get("total_interactions", 0),
                    comments="0",
                    saves=metric_data.get("saved", 0),
                    shares=metric_data.get("shares", 0),
                    total_interactions=metric_data.get("total_interactions", 0),
                    raw_metrics=metric_data,
                    captured_at=datetime.now(timezone.utc)
                )
                db.add(media_metric)
                
                job.progress = int(((index + 1) / total_items) * 95)
                await db.commit()

            logger.info(f"Starting niche detection for user {user_id}")
            detected_niche = await detect_niche_service(account.biography or "", all_captions)
            
            account.niche_detected = detected_niche
            db.add(account)
            
            job.progress = 100
            job.status = "succeeded"
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()

        except Exception as e:
            logger.error(f"Error in sync task: {e}")
            if job:
                job.status = "failed"
                job.error_message = str(e)
                await db.commit()
