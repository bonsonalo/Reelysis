
from fastapi import APIRouter, HTTPException
from app.core.logger import logger
from app.service.instagram_service import get_oauth_url_service, handle_oauth_callback_service
from app.api.dep import db_dependency, user_authentication_dependency
from fastapi.responses import RedirectResponse






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







# GET /instagram/accounts
# POST /instagram/sync