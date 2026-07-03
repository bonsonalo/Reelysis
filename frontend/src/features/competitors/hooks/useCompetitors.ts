import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompetitors, removeCompetitor, addCompetitor, rediscoverCompetitors } from '../api'

export const useCompetitors = (options?: { refetchInterval?: number | false | ((query: any) => number | false | undefined) }) => {
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

export const useAddCompetitor = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (handle: string) => addCompetitor(handle).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
    },
  })
}

export const useRediscoverCompetitors = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rediscoverCompetitors().then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-job', 'competitor_discovery'] })
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
    },
  })
}
