import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logoutUser } from '../api';
import { clearUser } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hook';

export function useLogout() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Clear local state even if the server call fails (e.g. session already expired),
  // so the next user in this tab never sees cached data from this one.
  const clearLocalSession = () => {
    queryClient.clear();
    dispatch(clearUser());
    router.push('/login');
  };

  return useMutation({
    mutationFn: logoutUser,
    onSettled: clearLocalSession,
  });
}
