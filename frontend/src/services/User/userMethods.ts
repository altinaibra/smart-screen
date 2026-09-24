import { api } from '../../api';
import type { AccessOption, User, UserRole } from '../../types';

/** password bosh gjatë ndryshimit = fjalëkalimi mbetet i njëjtë. */
export interface SaveUserRequest {
  username: string;
  password?: string | null;
  role: UserRole;
  businessIds: number[];
  screenIds: number[];
}

export const getUsers = () => api<User[]>('/users');

export const getAccessOptions = () => api<AccessOption[]>('/users/access-options');

export const createUser = (req: SaveUserRequest) => api<User>('/users', { method: 'POST', json: req });

export const updateUser = (id: number, req: SaveUserRequest) => api<User>(`/users/${id}`, { method: 'PUT', json: req });

export const deleteUser = (id: number) => api(`/users/${id}`, { method: 'DELETE' });
