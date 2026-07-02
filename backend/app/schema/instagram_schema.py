from pydantic import BaseModel, Field


class NicheConfirmRequest(BaseModel):
    niche: str


class NicheUpdateRequest(BaseModel):
    niche: str
    trigger_discovery: bool = False
