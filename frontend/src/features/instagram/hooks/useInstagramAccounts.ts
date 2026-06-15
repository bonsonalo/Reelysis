import { useQuery } from '@tanstack/react-query'
import { getInstagramAccounts } from '../api'

export const useInstagramAccounts = (options?: { refetchInterval?: number | false, enabled?: boolean }) => {
  return useQuery({
    queryKey: ['instagram-accounts'],
    queryFn: async () => {
      const data = await getInstagramAccounts()
      return data
    },
    ...options
  })
}
