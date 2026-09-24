import { useMutation, useQuery } from '@tanstack/react-query';
import type { Orientation } from '../../types';
import { dashboardKeys } from '../Dashboard/dashboardQueries';
import { queryClient } from '../queryClient';
import { screenKeys } from '../Screen/screenQueries';
import {
  createPlaylist, deletePlaylist, duplicatePlaylist, getPlaylist, getPlaylistPreview, getPlaylists, updatePlaylist,
  type SavePlaylistRequest,
} from './playlistMethods';

export const playlistKeys = {
  all: ['playlists'] as const,
  list: () => [...playlistKeys.all, 'list'] as const,
  detail: (id: number) => [...playlistKeys.all, 'detail', id] as const,
  preview: (id: number, orientation: Orientation) => [...playlistKeys.all, 'preview', id, orientation] as const,
};

const invalidate = () => Promise.all([
  queryClient.invalidateQueries({ queryKey: playlistKeys.all }),
  queryClient.invalidateQueries({ queryKey: screenKeys.all }), // emri i playlist-ës te ekranet
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
]);

export function usePlaylists() {
  return useQuery({ queryKey: playlistKeys.list(), queryFn: getPlaylists });
}

export function usePlaylist(id: number) {
  return useQuery({ queryKey: playlistKeys.detail(id), queryFn: () => getPlaylist(id), enabled: id > 0 });
}

export function usePlaylistPreview(id: number, orientation: Orientation) {
  return useQuery({ queryKey: playlistKeys.preview(id, orientation), queryFn: () => getPlaylistPreview(id, orientation), enabled: id > 0 });
}

export function useCreatePlaylist() {
  return useMutation({ mutationFn: (req: SavePlaylistRequest) => createPlaylist(req), onSuccess: invalidate });
}

export function useUpdatePlaylist() {
  return useMutation({
    mutationFn: ({ id, ...req }: SavePlaylistRequest & { id: number }) => updatePlaylist(id, req),
    onSuccess: invalidate,
  });
}

export function useDuplicatePlaylist() {
  return useMutation({ mutationFn: (id: number) => duplicatePlaylist(id), onSuccess: invalidate });
}

export function useDeletePlaylist() {
  return useMutation({ mutationFn: (id: number) => deletePlaylist(id), onSuccess: invalidate });
}
