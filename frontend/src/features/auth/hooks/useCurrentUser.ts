import { useQuery } from '@tanstack/react-query';
import {  useAppDispatch } from '../../../store/hook';
import { getCurrentUser } from '../api';
import { setUser } from '@/store/slices/authSlice';

export function useCurrentUser() {
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
  });
}
