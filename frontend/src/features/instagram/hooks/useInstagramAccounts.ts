import { useQuery } from '@tanstack/react-query'
import { getInstagramAccounts, InstagramAccount } from '../api'

type AccountsRefetchInterval =
  | number
  | false
  | ((query: { state: { data?: InstagramAccount[] } }) => number | false)

export const useInstagramAccounts = (options?: {
  refetchInterval?: AccountsRefetchInterval
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: ['instagram-accounts'],
    queryFn: getInstagramAccounts,
    ...options,
  })
}
