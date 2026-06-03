from pydantic import BaseModel
from typing import List, Optional

class VideoAnalysisResponse(BaseModel):
    topic: str
    category: str
    content_pillar: str
    hook: str
    hook_score: int
    pacing: str
    visual_style: str
    strengths: List[str]
    weaknesses: List[str]
    confidence: int

class RecommendationItem(BaseModel):
    title: str
    description: str
    priority: int  # 1-5, 5 being highest
    evidence: str   # Why is this being recommended?
    type: str       # e.g., "hook", "topic", "pacing", "format"

class StrategicReportResponse(BaseModel):
    summary: str
    market_trends: List[str]
    competitor_strengths: List[str]
    user_gaps: List[str]
    user_advantages: List[str]
    roadmap: List[RecommendationItem]
    report_markdown: str  # A full formatted markdown version for display
