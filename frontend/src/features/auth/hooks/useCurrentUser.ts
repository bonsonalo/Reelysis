import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {  useAppDispatch } from '../../../store/hook';
import { getCurrentUser, AuthUser } from '../api';
import { setUser } from '@/store/slices/authSlice';

export function useCurrentUser(options?: Partial<UseQueryOptions<AuthUser>>) {
  const dispatch = useAppDispatch();
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
        const response = await getCurrentUser();
        dispatch(setUser(response.data));
        return response.data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}
