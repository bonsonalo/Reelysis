import { useMutation, useQueryClient } from '@tanstack/react-query'
import { detectNiche, updateNiche } from '../api'

export const useDetectNiche = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: detectNiche,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
    },
  })
}

export const useUpdateNiche = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { niche: string; trigger_discovery?: boolean }) =>
      updateNiche(params.niche, params.trigger_discovery),
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
      if (params.trigger_discovery) {
        queryClient.invalidateQueries({ queryKey: ['analysis-job', 'competitor_discovery'] })
      }
    },
  })
}
