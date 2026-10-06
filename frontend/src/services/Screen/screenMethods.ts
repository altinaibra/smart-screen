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

/** Rruga e player-it për pikërisht këtë ekran: "/player/?device=…". */
export const getScreenLink = (id: number) => api<{ path: string }>(`/screens/${id}/link`);

export const replaceDevice = (id: number, pairingCode: string) =>
  api<Screen>(`/screens/${id}/replace-device`, { method: 'POST', json: { pairingCode } });

export const getServerInfo = () => api<ServerInfo>('/server-info');
