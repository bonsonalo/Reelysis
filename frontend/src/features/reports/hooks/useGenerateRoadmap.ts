import { useMutation } from '@tanstack/react-query';
import { generateReport } from '../api';
import { useQueryClient } from '@tanstack/react-query';

export const useGenerateRoadmap = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const response = await generateReport()
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-job', 'report_generation'] })
      if (data?.job_id) {
        queryClient.invalidateQueries({ queryKey: ['analysis-job-by-id', data.job_id] })
      }
    },
  })
}
