import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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

export const VIDEOS_PAGE_SIZE = 24;

/** Paginated Reels list for the /videos page ("Load more"). */
export const useAllVideos = () => {
  return useInfiniteQuery({
    queryKey: ['dashboard-videos', 'all'],
    queryFn: async ({ pageParam }) => {
      const response = await getDashboardVideos(VIDEOS_PAGE_SIZE, pageParam);
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      if (typeof lastPage.total === 'number') {
        return loaded < lastPage.total ? loaded : undefined;
      }
      return lastPage.data.length === VIDEOS_PAGE_SIZE ? loaded : undefined;
    },
    staleTime: 0,
  });
};
