from pydantic import BaseModel, field_validator


class AddCompetitorRequest(BaseModel):
    handle: str

    @field_validator("handle")
    @classmethod
    def normalize_handle(cls, value: str) -> str:
        cleaned = value.strip().lstrip("@")
        if not cleaned:
            raise ValueError("Instagram handle is required.")
        return cleaned
