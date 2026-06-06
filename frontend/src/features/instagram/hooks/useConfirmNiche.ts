import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmNiche } from '../api'

export const useConfirmNiche = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (niche: string) => confirmNiche(niche),
    onSuccess: () => {
      // Refresh the account data after confirmation
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
    },
  })
}
