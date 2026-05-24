import { useMutation } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hook';
import { loginUser } from '../api';
import { setUser, setError, setLoading } from '@/store/slices/authSlice';
import { AxiosError } from 'axios';

export function useLogin() {
  const dispatch = useAppDispatch();
  
  return useMutation({
    mutationFn: loginUser,
    onMutate: () => {
      dispatch(setLoading());
    },
    onSuccess: (response) => {
      dispatch(setUser(response.data));
    },
    onError: (error: AxiosError<{ message: string }>) => {
      dispatch(setError(error.response?.data?.message ?? 'Login failed'));
    },
  });
}
