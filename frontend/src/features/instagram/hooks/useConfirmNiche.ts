import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query'
import { confirmNiche } from '../api'

type ConfirmNicheResponse = { message: string; niche: string }

export const useConfirmNiche = (
  options?: UseMutationOptions<ConfirmNicheResponse, Error, string, unknown>,
) => {
  const queryClient = useQueryClient()
  const { onSuccess: userOnSuccess, ...restOptions } = options ?? {}

  return useMutation({
    ...restOptions,
    mutationFn: (niche: string) => confirmNiche(niche),
    onSuccess: (data, variables, context, mutation) => {
      // Confirming the niche starts competitor discovery on the backend, so the
      // discovery job and competitor list must be refetched for polling to start.
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-job', 'competitor_discovery'] })
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
      userOnSuccess?.(data, variables, context, mutation)
    },
  })
}
