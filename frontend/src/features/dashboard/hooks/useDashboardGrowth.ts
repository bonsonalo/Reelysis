import { useQuery } from '@tanstack/react-query';
import { getDashboardGrowth } from '../api';

export const useDashboardGrowth = () => {
  return useQuery({
    queryKey: ['dashboard-growth'],
    queryFn: async () => {
      const response = await getDashboardGrowth();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
