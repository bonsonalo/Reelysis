import { useMutation } from '@tanstack/react-query';
import { registerUser } from '../api';
import { setUser, setError, setLoading } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hook';
import { AxiosError } from 'axios';

export function useRegister() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: registerUser,
    onMutate: () => {
      dispatch(setLoading());
    },
    onSuccess: (response) => {
      dispatch(setUser(response.data));
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      dispatch(setError(error.response?.data?.detail ?? 'Registration failed'));
    },
  });
}
