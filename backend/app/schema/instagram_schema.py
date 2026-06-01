from pydantic import BaseModel

class NicheConfirmRequest(BaseModel):
    niche: str
