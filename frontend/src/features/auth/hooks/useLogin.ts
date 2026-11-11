import { getApiErrorMessage } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hook';
import { loginUser } from '../api';
import { setUser, setError, setLoading } from '@/store/slices/authSlice';

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
    onError: (error: unknown) => {
      dispatch(setError(getApiErrorMessage(error, 'Login failed')));
    },
  });
}
