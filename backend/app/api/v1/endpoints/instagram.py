from fastapi import APIRouter, HTTPException, status
from app.core.logger import logger
from app.service.instagram_service import (
    get_oauth_url_service, 
    handle_oauth_callback_service,
    get_connected_accounts_service,
    disconnect_instagram_service,
    trigger_instagram_sync_service,
    confirm_instagram_niche_service
)
from app.api.dep import db_dependency, user_authentication_dependency
from fastapi.responses import RedirectResponse
from app.schema.instagram_schema import NicheConfirmRequest

router= APIRouter(
    prefix="/api/v1/instagram", 
    tags=["instagram"]
    )

@router.get("/oauth/start")
async def start_oauth(current_user: user_authentication_dependency):
    user_id= current_user.id
    try:
        oauth_url= await get_oauth_url_service(user_id)
        return {"oauth_url": oauth_url}
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/oauth/callback")
async def oauth_callback(code: str, state: str, db: db_dependency):
    try:
        await handle_oauth_callback_service(code, state, db)
        return RedirectResponse(url="http://localhost:3000/dashboard?connected=true", status_code=302)
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/accounts")
async def get_accounts(current_user: user_authentication_dependency, db: db_dependency):
    try:
        accounts = await get_connected_accounts_service(current_user.id, db)
        return accounts
    except Exception as e:
        logger.error(f"Error fetching accounts: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch connected accounts")

@router.delete("/disconnect")
async def disconnect_instagram(current_user: user_authentication_dependency, db: db_dependency):
    try:
        await disconnect_instagram_service(current_user.id, db)
        return {"message": "Instagram account disconnected successfully"}
    except Exception as e:
        logger.error(f"Error disconnecting account: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect Instagram account")

@router.post("/sync")
async def trigger_sync(current_user: user_authentication_dependency, db: db_dependency):
    """
    Triggers a background sync of Instagram media and metrics.
    Returns the job_id for polling.
    """
    try:
        job = await trigger_instagram_sync_service(current_user.id, db)
        return {
            "message": "Sync job triggered",
            "job_id": job.id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error triggering sync: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger sync")

@router.patch("/niche/confirm")
async def confirm_niche(request: NicheConfirmRequest, current_user: user_authentication_dependency, db: db_dependency):
    """
    Confirms or manually sets the Instagram account's niche.
    """
    try:
        account = await confirm_instagram_niche_service(current_user.id, request.niche, db)
        return {"message": "Niche confirmed", "niche": account.niche_confirmed}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error confirming niche: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm niche")
