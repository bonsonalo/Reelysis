import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompetitors, removeCompetitor } from '../api'

export const useCompetitors = (options?: { refetchInterval?: number | false }) => {
  return useQuery({
    queryKey: ['competitors'],
    queryFn: async () => {
      const response = await getCompetitors()
      return response.data
    },
    ...options
  })
}

export const useRemoveCompetitor = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
    }
  })
}
