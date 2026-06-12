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
