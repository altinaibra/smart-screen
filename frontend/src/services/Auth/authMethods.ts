import { api } from '../../api';
import type { LoginResponse } from '../../types';

export const login = (username: string, password: string) =>
  api<LoginResponse>('/auth/login', { method: 'POST', json: { username, password } });

export const changeUsername = (currentPassword: string, newUsername: string) =>
  api<LoginResponse>('/auth/username', { method: 'PUT', json: { currentPassword, newUsername } });

export const changePassword = (currentPassword: string, newPassword: string) =>
  api('/auth/password', { method: 'PUT', json: { currentPassword, newPassword } });
