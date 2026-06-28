import { useQuery } from '@tanstack/react-query';
import { getDashboardGrowth } from '../api';

export const useDashboardGrowth = () => {
  return useQuery({
    queryKey: ['dashboard-growth'],
    queryFn: async () => {
      const response = await getDashboardGrowth();
      return response.data;
    },
    staleTime: 0, // Always refetch to show latest data
  });
};
