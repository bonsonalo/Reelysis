import { useQuery } from '@tanstack/react-query';
import { getContentPillars } from '../api';

export const useContentPillars = () => {
  return useQuery({
    queryKey: ['dashboard-pillars'],
    queryFn: async () => {
      const response = await getContentPillars();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
