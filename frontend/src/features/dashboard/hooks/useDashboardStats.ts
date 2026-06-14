import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../api';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await getDashboardStats();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
