import { useQuery } from '@tanstack/react-query';
import { getDashboardVideos } from '../api';

export const useDashboardVideos = (limit: number = 6) => {
  return useQuery({
    queryKey: ['dashboard-videos', limit],
    queryFn: async () => {
      const response = await getDashboardVideos(limit);
      return response.data;
    },
    staleTime: 0, // Always refetch to show latest data
  });
};
