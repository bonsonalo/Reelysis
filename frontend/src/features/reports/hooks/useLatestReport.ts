import { useQuery } from '@tanstack/react-query';
import { getLatestReport, getRoadmap } from '../api';

export const useLatestReport = () => {
  return useQuery({
    queryKey: ['latest-report'],
    queryFn: async () => {
      const response = await getLatestReport();
      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useRoadmap = () => {
  return useQuery({
    queryKey: ['roadmap'],
    queryFn: async () => {
      const response = await getRoadmap();
      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};
