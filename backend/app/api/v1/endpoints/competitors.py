from fastapi import APIRouter, HTTPException
from typing import List
from uuid import UUID
from fastapi.responses import Response
from app.api.dep import db_dependency, user_authentication_dependency
from app.model.competitor_accounts import CompetitorAccount
from app.schema.competitor_schema import AddCompetitorRequest
from app.service.competitor_service import (
    add_competitor_by_handle_service,
    rediscover_competitors_service,
)
from app.utils.cdn_image import fetch_cdn_image
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
async def discover_competitors(
    db: db_dependency,
    current_user: user_authentication_dependency,
):
    """
    Re-run automatic competitor discovery for the user's confirmed niche.
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
    """Proxy Instagram profile images (CDN blocks direct browser hotlinking)."""
    stmt = select(CompetitorAccount).where(
        CompetitorAccount.id == competitor_id,
        CompetitorAccount.user_id == current_user["id"],
    )
    competitor = (await db.exec(stmt)).first()
    if not competitor or not competitor.profile_picture_url:
        raise HTTPException(status_code=404, detail="Avatar not found")

    content, media_type = await fetch_cdn_image(competitor.profile_picture_url)
    return Response(content=content, media_type=media_type)

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
