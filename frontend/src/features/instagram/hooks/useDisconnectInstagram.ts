import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

const DISCONNECT_INVALIDATION_KEYS = [
  'instagram-accounts',
  'reports',
  'report',
  'latest-report',
  'roadmap',
  'competitors',
  'dashboard-stats',
  'dashboard-growth',
  'dashboard-pillars',
  'dashboard-videos',
  'video-analysis',
  'analysis-job',
  'analysis-job-by-id',
] as const

export const useDisconnectInstagram = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.delete('/api/v1/instagram/disconnect'),
    onSuccess: () => {
      queryClient.setQueryData(['instagram-accounts'], [])

      for (const key of DISCONNECT_INVALIDATION_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}
