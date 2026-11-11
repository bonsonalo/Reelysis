from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Any

class DashboardStats(BaseModel):
    total_views: int
    avg_reach: int
    avg_engagement: float
    top_hook_score: float
    top_analysis_confidence: float
    views_change: str
    reach_change: str
    engagement_change: str
    hook_change: str
    has_video_analysis: bool = False

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
    has_analysis: bool = False

class DashboardVideosResponse(BaseModel):
    data: List[VideoFeedItem]
    total: int = 0

class VideoDetailResponse(BaseModel):
    media: Any
    analysis: Any
    metrics: Any
