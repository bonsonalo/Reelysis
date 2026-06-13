from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Any

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

class VideoFeedItem(BaseModel):
    id: str
    thumbnail_url: str
    caption: str
    hook_score: int
    views: int
    engagement_rate: float
    permalink: str

class DashboardVideosResponse(BaseModel):
    data: List[VideoFeedItem]

class VideoDetailResponse(BaseModel):
    media: Any
    analysis: Any
    metrics: Any
