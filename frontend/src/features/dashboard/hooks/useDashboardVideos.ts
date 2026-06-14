import { useQuery } from '@tanstack/react-query';
import { getDashboardVideos } from '../api';

export const useDashboardVideos = (limit: number = 6) => {
  return useQuery({
    queryKey: ['dashboard-videos', limit],
    queryFn: async () => {
      const response = await getDashboardVideos(limit);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
