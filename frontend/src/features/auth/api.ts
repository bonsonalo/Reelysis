import { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

export interface MessageResponse {
  message: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export async function loginUser(credentials: LoginCredentials): Promise<AxiosResponse<AuthUser>> {
  return api.post<AuthUser>('/api/v1/auth/login', credentials);
}

export async function registerUser(data: RegisterData): Promise<AxiosResponse<AuthUser>> {
  return api.post<AuthUser>('/api/v1/auth/signup', data);
}

export async function logoutUser(): Promise<AxiosResponse<void>> {
  return api.post('/api/v1/auth/logout');
}

export async function getCurrentUser(): Promise<AxiosResponse<AuthUser>> {
  return api.get<AuthUser>('/api/v1/auth/profile');
}

export async function requestPasswordReset(email: string) {
  return api.post<MessageResponse>('/api/v1/auth/password/forgot', { email });
}

export async function resetPassword(token: string, password: string) {
  return api.post<MessageResponse>('/api/v1/auth/password/reset', { token, password });
}

export async function changePassword(data: ChangePasswordData) {
  return api.post<MessageResponse>('/api/v1/auth/password/change', data);
}

export async function verifyEmail(token: string) {
  return api.post<MessageResponse & { email_verified: boolean }>('/api/v1/auth/email/verify', {
    token,
  });
}

export async function resendVerificationEmail() {
  return api.post<MessageResponse>('/api/v1/auth/email/resend');
}

export async function deleteAccount(password: string) {
  return api.delete<MessageResponse>('/api/v1/auth/account', { data: { password } });
}
