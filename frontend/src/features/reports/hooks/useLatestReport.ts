import { useQuery } from '@tanstack/react-query';
import { getLatestReport, getReport, getReports, getRoadmap } from '../api';

export const useReports = () => {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await getReports();
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useReport = (reportId: string) => {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const response = await getReport(reportId);
      return response.data;
    },
    enabled: !!reportId,
    staleTime: 1000 * 60 * 30,
  });
};

export const useLatestReport = () => {
  return useQuery({
    queryKey: ['latest-report'],
    queryFn: async () => {
      const response = await getLatestReport();
      return response.data;
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useRoadmap = () => {
  return useQuery({
    queryKey: ['roadmap'],
    queryFn: async () => {
      const response = await getRoadmap();
      return response.data;
    },
    staleTime: 1000 * 60 * 30,
  });
};
