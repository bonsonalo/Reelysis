import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface VideoMedia {
  id: string;
  caption: string;
  permalink: string;
  thumbnail_url: string;
  transcript_text?: string;
  transcript_source?: string;
  published_at?: string;
}

export interface VideoAnalysisRecord {
  hook_score: number;
  engagement_score: number;
  confidence: number;
  content_pillar: string;
  topic?: string;
  category?: string;
  analysis_detail?: {
    hook?: string;
    pacing?: string;
    visual_style?: string;
    strengths?: string[];
    weaknesses?: string[];
  };
}

export interface VideoMetrics {
  view: number;
  reach?: number;
  likes?: number;
  total_interactions?: number;
}

export interface VideoAnalysisDetail {
  media: VideoMedia | null;
  analysis: VideoAnalysisRecord | null;
  metrics: VideoMetrics | null;
}

export const useVideoAnalysis = (videoId: string) => {
  return useQuery({
    queryKey: ['video-analysis', videoId],
    queryFn: async () => {
      const response = await api.get<VideoAnalysisDetail>(`/api/v1/analysis/videos/${videoId}`);
      return response.data;
    },
    enabled: !!videoId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
