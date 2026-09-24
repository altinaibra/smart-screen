import { api } from '../../api';
import type { Settings } from '../../types';

export const getSettings = () => api<Settings>('/settings');

export const updateSettings = (settings: Settings) => api<Settings>('/settings', { method: 'PUT', json: settings });
