import { api } from '../../api';
import type { Orientation, Playlist, PlaylistItem, PlaylistSummary } from '../../types';

export interface SavePlaylistRequest {
  name: string;
  description?: string | null;
  items: PlaylistItem[];
}

export const getPlaylists = () => api<PlaylistSummary[]>('/playlists');

export const getPlaylist = (id: number) => api<Playlist>(`/playlists/${id}`);

/** Përmbajtja siç e sheh TV-ja (për preview). */
export const getPlaylistPreview = (id: number, orientation: Orientation) =>
  api<unknown>(`/playlists/${id}/preview?orientation=${orientation}`);

export const createPlaylist = (req: SavePlaylistRequest) => api<Playlist>('/playlists', { method: 'POST', json: req });

export const updatePlaylist = (id: number, req: SavePlaylistRequest) => api<Playlist>(`/playlists/${id}`, { method: 'PUT', json: req });

export const duplicatePlaylist = (id: number) => api<Playlist>(`/playlists/${id}/duplicate`, { method: 'POST' });

export const deletePlaylist = (id: number) => api(`/playlists/${id}`, { method: 'DELETE' });
