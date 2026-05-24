import { useMutation } from '@tanstack/react-query';
import { logoutUser } from '../api';
import { clearUser } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hook';

export function useLogout() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      dispatch(clearUser());
    },
  });
}
