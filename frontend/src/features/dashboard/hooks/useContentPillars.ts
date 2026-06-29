import { useQuery } from '@tanstack/react-query';
import { getContentPillars } from '../api';

export const useContentPillars = () => {
  return useQuery({
    queryKey: ['dashboard-pillars'],
    queryFn: async () => {
      const response = await getContentPillars();
      return response.data;
    },
    staleTime: 0, // Always refetch to show latest data
  });
};
