import { useMutation } from '@tanstack/react-query';
import { generateReport } from '../api';
import { useQueryClient } from '@tanstack/react-query';

export const useGenerateRoadmap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateReport(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['latest-report'] });
      queryClient.invalidateQueries({ queryKey: ['analysis-job', 'report_generation'] });
    },
  });
};
