from fastapi import APIRouter, HTTPException, Request
from typing import List
from uuid import UUID
from fastapi.responses import Response
from app.api.dep import db_dependency, user_authentication_dependency
from app.core.rate_limit import get_user_key, job_trigger_limit, limiter
from app.model.competitor_accounts import CompetitorAccount
from app.schema.competitor_schema import AddCompetitorRequest
from app.service.competitor_service import (
    add_competitor_by_handle_service,
    rediscover_competitors_service,
)
from app.utils.cdn_image import (
    competitor_avatar_cache_key,
    fetch_cdn_image,
    get_cached_avatar,
    set_cached_avatar,
)
from sqlmodel import select

router = APIRouter(
    prefix="/api/v1/competitors",
    tags=["competitors"]
)

@router.get("/", response_model=List[CompetitorAccount])
async def get_competitors(
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Returns the list of discovered competitors for the current user.
    """
    try:
        stmt = select(CompetitorAccount).where(CompetitorAccount.user_id == current_user["id"])
        result = await db.exec(stmt)
        return result.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=CompetitorAccount)
async def add_competitor(
    request: AddCompetitorRequest,
    db: db_dependency,
    current_user: user_authentication_dependency,
):
    """
    Manually add a competitor by Instagram handle.
    """
    try:
        competitor = await add_competitor_by_handle_service(
            current_user["id"],
            request.handle,
            db,
        )
        return competitor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discover")
@limiter.limit(job_trigger_limit, key_func=get_user_key)
async def discover_competitors(
    request: Request,
    db: db_dependency,
    current_user: user_authentication_dependency,
):
    """
    Ask Gemini for fresh competitor suggestions and replace auto-discovered accounts.
    """
    try:
        job = await rediscover_competitors_service(current_user["id"], db)
        return {
            "message": "Competitor discovery triggered",
            "job_id": job.id,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/avatar")
async def get_competitor_avatar(
    competitor_id: UUID,
    db: db_dependency,
    current_user: user_authentication_dependency,
):
    """Proxy profile image bytes (Instagram CDN blocks direct browser hotlinking)."""
    stmt = select(CompetitorAccount).where(
        CompetitorAccount.id == competitor_id,
        CompetitorAccount.user_id == current_user["id"],
    )
    competitor = (await db.exec(stmt)).first()
    if not competitor or not competitor.profile_picture_url:
        raise HTTPException(status_code=404, detail="Avatar not found")

    cache_key = competitor_avatar_cache_key(competitor_id)
    cached = await get_cached_avatar(cache_key)
    if cached:
        content, media_type = cached
    else:
        try:
            content, media_type = await fetch_cdn_image(competitor.profile_picture_url)
            await set_cached_avatar(cache_key, content, media_type)
        except HTTPException as exc:
            if exc.status_code in (502, 504):
                raise HTTPException(
                    status_code=404,
                    detail="Avatar unavailable. Try refreshing competitor data.",
                ) from exc
            raise
    return Response(
        content=content,
        media_type=media_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )

@router.get("/{competitor_id}", response_model=CompetitorAccount)
async def get_competitor(
    competitor_id: UUID,
    db: db_dependency,
    current_user: user_authentication_dependency,
):
    """
    Returns a single tracked competitor.
    """
    stmt = select(CompetitorAccount).where(
        CompetitorAccount.id == competitor_id,
        CompetitorAccount.user_id == current_user["id"],
    )
    competitor = (await db.exec(stmt)).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return competitor

@router.delete("/{competitor_id}")
async def remove_competitor(
    competitor_id: UUID,
    db: db_dependency,
    current_user: user_authentication_dependency
):
    """
    Removes a competitor from the tracking list.
    """
    try:
        stmt = select(CompetitorAccount).where(
            CompetitorAccount.id == competitor_id,
            CompetitorAccount.user_id == current_user["id"]
        )
        competitor = (await db.exec(stmt)).first()
        if not competitor:
            raise HTTPException(status_code=404, detail="Competitor not found")
        
        await db.delete(competitor)
        await db.commit()
        return {"message": "Competitor removed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
