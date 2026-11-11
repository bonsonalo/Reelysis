import { useEffect } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useAppDispatch } from '../../../store/hook';
import { getCurrentUser, AuthUser } from '../api';
import { setUser } from '@/store/slices/authSlice';

export function useCurrentUser(options?: Partial<UseQueryOptions<AuthUser>>) {
  const dispatch = useAppDispatch();
  const query = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await getCurrentUser();
      return response.data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    ...options,
  });

  // Sync Redux from the query result (also covers cache hits, not just network fetches).
  useEffect(() => {
    if (query.data) dispatch(setUser(query.data));
  }, [query.data, dispatch]);

  return query;
}
