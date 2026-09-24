import { api } from '../../api';
import type { Orientation, Schedule, Screen, ServerInfo } from '../../types';

export interface PairScreenRequest {
  pairingCode: string;
  name: string;
  location?: string | null;
  defaultPlaylistId?: number | null;
  orientation: Orientation;
}

export interface UpdateScreenRequest {
  name: string;
  location?: string | null;
  defaultPlaylistId?: number | null;
  orientation: Orientation;
  schedules: Schedule[];
}

export const getScreens = () => api<Screen[]>('/screens');

export const pairScreen = (req: PairScreenRequest) => api<Screen>('/screens/pair', { method: 'POST', json: req });

export const updateScreen = (id: number, req: UpdateScreenRequest) => api<Screen>(`/screens/${id}`, { method: 'PUT', json: req });

export const reloadScreen = (id: number) => api(`/screens/${id}/reload`, { method: 'POST' });

export const deleteScreen = (id: number) => api(`/screens/${id}`, { method: 'DELETE' });

export const getServerInfo = () => api<ServerInfo>('/server-info');
