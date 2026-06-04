import apiClient from './baseClient';
import { AuthResponseDto } from '../types/auth';

export async function login(username: string, password: string): Promise<AuthResponseDto> {
  const res = await apiClient.post<{ data: AuthResponseDto }>('/auth/login', { username, password });
  return res.data.data;
}

export async function changePassword(newPassword: string, confirmPassword: string): Promise<void> {
  await apiClient.put('/auth/change-password', { newPassword, confirmPassword });
}
