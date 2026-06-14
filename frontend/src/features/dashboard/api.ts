import { api } from '@/lib/axios';

export interface DashboardStats {
  total_views: number;
  avg_reach: number;
  avg_engagement: number;
  top_hook_score: number;
  views_change: string;
  reach_change: string;
  engagement_change: string;
  hook_change: string;
}

export interface GrowthDataPoint {
  date: string;
  views: number;
  reach: number;
}

export interface DashboardGrowthResponse {
  data: GrowthDataPoint[];
}

export interface ContentPillarStat {
  pillar: string;
  count: number;
  avg_engagement: number;
}

export interface DashboardPillarsResponse {
  data: ContentPillarStat[];
}

export interface VideoFeedItem {
  id: string;
  thumbnail_url: string;
  caption: string;
  hook_score: number;
  views: number;
  engagement_rate: number;
  permalink: string;
}

export interface DashboardVideosResponse {
  data: VideoFeedItem[];
}

export const getDashboardStats = () => {
  return api.get<DashboardStats>('/api/v1/analysis/dashboard/stats');
};

export const getDashboardGrowth = () => {
  return api.get<DashboardGrowthResponse>('/api/v1/analysis/dashboard/growth');
};

export const getContentPillars = () => {
  return api.get<DashboardPillarsResponse>('/api/v1/analysis/dashboard/pillars');
};

export const getDashboardVideos = (limit: number = 6) => {
  return api.get<DashboardVideosResponse>(`/api/v1/analysis/dashboard/videos?limit=${limit}`);
};
