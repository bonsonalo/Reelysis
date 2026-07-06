from fastapi import APIRouter, HTTPException, Request
from uuid import UUID
from fastapi.responses import RedirectResponse
from sqlmodel import select
from app.core.config import settings
from app.core.logger import logger
from app.core.rate_limit import (
    ai_trigger_limit,
    get_user_key,
    job_trigger_limit,
    limiter,
)
from app.service.instagram_service import (
    get_oauth_url_service, 
    handle_oauth_callback_service,
    get_connected_accounts_service,
    disconnect_instagram_service,
    trigger_instagram_sync_service,
    confirm_instagram_niche_service,
    update_instagram_niche_service,
    detect_instagram_niche_service,
)
from app.api.dep import db_dependency, user_authentication_dependency
from fastapi.responses import RedirectResponse
from app.schema.instagram_schema import NicheConfirmRequest, NicheUpdateRequest
from app.model.media_items import MediaItem

router= APIRouter(
    prefix="/api/v1/instagram", 
    tags=["instagram"]
    )

@router.get("/oauth/start")
async def start_oauth(current_user: user_authentication_dependency):
    user_id= current_user["id"]
    logger.info("got the user_id")
    try:
        oauth_url= await get_oauth_url_service(user_id)
        logger.info("Done with start endpoint")
        return {"oauth_url": oauth_url}

    except ValueError as e:
        logger.error(f"OAuth Validation Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"OAuth System Error (Check Redis): {str(e)}")
        raise HTTPException(status_code=500, detail="External connection failure. Please ensure Redis is running.")

@router.get("/oauth/callback")
async def oauth_callback(code: str, state: str, db: db_dependency):
    try:
        logger.info(f"CALLBACK HIT — full code param: {code}")
        await handle_oauth_callback_service(code, state, db)
        frontend = settings.FRONTEND_URL.rstrip("/")
        return RedirectResponse(url=f"{frontend}/onboarding?connected=true", status_code=302)
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/accounts")
async def get_accounts(current_user: user_authentication_dependency, db: db_dependency):
    try:
        accounts = await get_connected_accounts_service(current_user["id"], db)
        return accounts
    except Exception as e:
        logger.error(f"Error fetching accounts: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch connected accounts")

@router.delete("/disconnect")
async def disconnect_instagram(current_user: user_authentication_dependency, db: db_dependency):
    """
    Disconnect Instagram and permanently delete all synced data
    (reels, competitors, reports, analyses, and background jobs).
    """
    try:
        await disconnect_instagram_service(current_user["id"], db)
        return {"message": "Instagram disconnected and all synced data deleted."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error disconnecting account: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect Instagram account")

@router.post("/sync")
@limiter.limit(job_trigger_limit, key_func=get_user_key)
async def trigger_sync(
    request: Request,
    current_user: user_authentication_dependency,
    db: db_dependency,
):
    """
    Triggers a background sync of Instagram media and metrics.
    Returns the job_id for polling.
    """
    try:
        job = await trigger_instagram_sync_service(current_user["id"], db)
        return {
            "message": "Sync job triggered",
            "job_id": job.id,
            "status": job.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error triggering sync: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger sync")

@router.patch("/niche/confirm")
@limiter.limit(job_trigger_limit, key_func=get_user_key)
async def confirm_niche(
    request: Request,
    request_body: NicheConfirmRequest,
    current_user: user_authentication_dependency,
    db: db_dependency,
):
    """
    Confirms niche during onboarding and triggers competitor discovery.
    """
    try:
        account = await confirm_instagram_niche_service(current_user["id"], request_body.niche, db)
        return {"message": "Niche confirmed", "niche": account.niche_confirmed}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error confirming niche: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm niche")


@router.patch("/niche")
@limiter.limit(job_trigger_limit, key_func=get_user_key)
async def update_niche(
    request: Request,
    request_body: NicheUpdateRequest,
    current_user: user_authentication_dependency,
    db: db_dependency,
):
    """
    Update the confirmed niche from settings (optionally re-run competitor discovery).
    """
    try:
        account = await update_instagram_niche_service(
            current_user["id"],
            request_body.niche,
            db,
            trigger_discovery=request_body.trigger_discovery,
        )
        return {
            "message": "Niche updated",
            "niche_confirmed": account.niche_confirmed,
            "niche_detected": account.niche_detected,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating niche: {e}")
        raise HTTPException(status_code=500, detail="Failed to update niche")


@router.post("/niche/detect")
@limiter.limit(ai_trigger_limit, key_func=get_user_key)
async def detect_niche(
    request: Request,
    current_user: user_authentication_dependency,
    db: db_dependency,
):
    """
    Re-run AI niche detection from synced bio, captions, and hashtags.
    """
    try:
        result = await detect_instagram_niche_service(current_user["id"], db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error detecting niche: {e}")
        raise HTTPException(status_code=500, detail="Failed to detect niche")


@router.get("/media/{media_id}/thumbnail")
async def get_media_thumbnail(
    media_id: UUID,
    current_user: user_authentication_dependency,
    db: db_dependency,
):
    """Redirect to the CDN thumbnail URL (browser loads it; server cannot always reach Instagram CDN)."""
    stmt = select(MediaItem).where(
        MediaItem.id == media_id,
        MediaItem.user_id == current_user["id"],
    )
    media = (await db.exec(stmt)).first()
    if not media or not media.thumbnail_url:
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return RedirectResponse(url=media.thumbnail_url, status_code=307)
