import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query'
import { confirmNiche } from '../api'

export const useConfirmNiche = (options?: UseMutationOptions<any, Error, string>) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (niche: string) => confirmNiche(niche),
    onSuccess: (data, variables, context) => {
      // Refresh the account data after confirmation
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}
