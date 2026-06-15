import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export const useGenerateRoadmap = () => {
  return useMutation({
    mutationFn: () => api.post('/api/v1/analysis/report/generate'),
  });
};
