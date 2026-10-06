import { api } from '../../api';
import type { SaveAlertRequest, Settings } from '../../types';

export const getSettings = () => api<Settings>('/settings');

export const updateSettings = (settings: Settings) => api<Settings>('/settings', { method: 'PUT', json: settings });

export const setAlert = (req: SaveAlertRequest) => api<Settings>('/settings/alert', { method: 'PUT', json: req });

export const clearAlert = () => api<Settings>('/settings/alert', { method: 'DELETE' });
