import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query'
import { confirmNiche } from '../api'

export const useConfirmNiche = (options?: UseMutationOptions<any, Error, string, unknown>) => {
  const queryClient = useQueryClient()

  const userOnSuccess = options?.onSuccess

  return useMutation({
    mutationFn: (niche: string) => confirmNiche(niche),
    onSuccess: (data, variables, context, mutation) => {
      // Refresh the account data after confirmation
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
      userOnSuccess?.(data, variables, context, mutation)
    },
    ...options
  })
}
