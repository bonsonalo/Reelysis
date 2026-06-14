import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface VideoAnalysisDetail {
  media: any;
  analysis: any;
  metrics: any;
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
