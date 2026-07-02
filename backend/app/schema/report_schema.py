from datetime import datetime
from typing import Any, List
from uuid import UUID

from pydantic import BaseModel


class ReportListItem(BaseModel):
    id: UUID
    title: str
    status: str
    summary: str
    created_at: datetime


class RecommendationResponse(BaseModel):
    id: UUID
    title: str
    description: str
    recommedation_type: str
    priority: int
    evidence: str
    status: str


class ReportDetailResponse(BaseModel):
    id: UUID
    title: str
    status: str
    summary: str
    report_markdown: str
    report_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    recommendations: List[RecommendationResponse]
