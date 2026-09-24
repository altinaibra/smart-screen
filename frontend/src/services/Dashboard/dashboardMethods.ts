import { api } from '../../api';
import type { Dashboard } from '../../types';

export const getDashboard = () => api<Dashboard>('/dashboard');
