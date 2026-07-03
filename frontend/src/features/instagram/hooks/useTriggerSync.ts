import { useMutation, useQueryClient } from '@tanstack/react-query'
import { triggerInstagramSync } from '../api'

export const useTriggerSync = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: triggerInstagramSync,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['analysis-job', 'instagram_sync'] })
      if (data.job_id) {
        queryClient.invalidateQueries({ queryKey: ['analysis-job-by-id', data.job_id] })
      }
    },
  })
}
