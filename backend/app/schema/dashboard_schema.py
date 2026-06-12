from pydantic import BaseModel
from datetime import datetime
from typing import List

class DashboardStats(BaseModel):
    total_views: int
    avg_reach: int
    avg_engagement: float
    top_hook_score: float
    views_change: str
    reach_change: str
    engagement_change: str
    hook_change: str

class GrowthDataPoint(BaseModel):
    date: str
    views: int
    reach: int

class DashboardGrowthResponse(BaseModel):
    data: List[GrowthDataPoint]

class ContentPillarStat(BaseModel):
    pillar: str
    count: int
    avg_engagement: float

class DashboardPillarsResponse(BaseModel):
    data: List[ContentPillarStat]
