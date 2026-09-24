import { api, uploadFile } from '../../api';
import type { Media, MediaType } from '../../types';

export const getMedia = (type?: MediaType) => api<Media[]>(`/media${type ? `?type=${type}` : ''}`);

/** Ngarkim me progres (për video të mëdha). */
export const uploadMedia = (file: File, onProgress: (percent: number) => void) => uploadFile<Media>(file, onProgress);

export const renameMedia = (id: number, name: string) => api<Media>(`/media/${id}`, { method: 'PUT', json: { name } });

export const deleteMedia = (id: number) => api(`/media/${id}`, { method: 'DELETE' });
