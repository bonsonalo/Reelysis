import { clearUser } from '@/store/slices/authSlice';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  changePassword,
  ChangePasswordData,
  deleteAccount,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from '../api';
import { useAppDispatch } from '@/store/hook';
import { setEmailVerified } from '@/store/slices/authSlice';

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email).then((res) => res.data),
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (params: { token: string; password: string }) =>
      resetPassword(params.token, params.password).then((res) => res.data),
    // Every session was revoked server-side (and this browser's cookies cleared), so drop local auth too.
    onSuccess: () => {
      queryClient.clear();
      dispatch(clearUser());
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordData) => changePassword(data).then((res) => res.data),
  });
}

export function useVerifyEmail() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => verifyEmail(token).then((res) => res.data),
    onSuccess: () => {
      dispatch(setEmailVerified());
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => resendVerificationEmail().then((res) => res.data),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (password: string) => deleteAccount(password).then((res) => res.data),
    onSuccess: () => {
      // Full reload drops every cached query and Redux state in one go. Clearing the
      // cache in place would refetch the profile, 401, and race a redirect to /login.
      window.location.assign('/');
    },
  });
}
