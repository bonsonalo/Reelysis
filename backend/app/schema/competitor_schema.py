from pydantic import BaseModel, field_validator

from app.utils.instagram_handle import normalize_handle


class AddCompetitorRequest(BaseModel):
    handle: str

    @field_validator("handle")
    @classmethod
    def normalize_handle(cls, value: str) -> str:
        return normalize_handle(value)
