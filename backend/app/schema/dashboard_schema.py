from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_views: int
    avg_reach: int
    avg_engagement: float
    top_hook_score: float
    views_change: str
    reach_change: str
    engagement_change: str
    hook_change: str
