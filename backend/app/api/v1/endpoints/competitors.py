from fastapi import APIRouter, HTTPException, Depends
from typing import List
from uuid import UUID
from app.api.dep import db_dependency, user_authentication_dependency
from app.model.competitor_accounts import CompetitorAccount
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
