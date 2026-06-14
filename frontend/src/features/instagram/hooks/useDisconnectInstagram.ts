import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export const useDisconnectInstagram = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.delete('/api/v1/instagram/disconnect'),
    onSuccess: () => {
      // Clear the account data after disconnection
      queryClient.setQueryData(['instagram-accounts'], [])
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
    },
  })
}
