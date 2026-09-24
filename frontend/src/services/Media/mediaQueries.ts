import { useMutation, useQuery } from '@tanstack/react-query';
import type { MediaType } from '../../types';
import { dashboardKeys } from '../Dashboard/dashboardQueries';
import { menuKeys } from '../Menu/menuQueries';
import { playlistKeys } from '../Playlist/playlistQueries';
import { queryClient } from '../queryClient';
import { settingsKeys } from '../Settings/settingsQueries';
import { deleteMedia, getMedia, renameMedia, uploadMedia } from './mediaMethods';

export const mediaKeys = {
  all: ['media'] as const,
  list: (type?: MediaType) => [...mediaKeys.all, type ?? 'all'] as const,
};

const invalidateMedia = () => Promise.all([
  queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
]);

export function useMediaList(type?: MediaType) {
  return useQuery({ queryKey: mediaKeys.list(type), queryFn: () => getMedia(type) });
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress: (percent: number) => void }) => uploadMedia(file, onProgress),
    onSuccess: invalidateMedia,
  });
}

export function useRenameMedia() {
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameMedia(id, name),
    onSuccess: invalidateMedia,
  });
}

/** Media fshihet edhe nga playlistat, produktet dhe logo-ja. */
export function useDeleteMedia() {
  return useMutation({
    mutationFn: (id: number) => deleteMedia(id),
    onSuccess: () => Promise.all([
      invalidateMedia(),
      queryClient.invalidateQueries({ queryKey: playlistKeys.all }),
      queryClient.invalidateQueries({ queryKey: menuKeys.all }),
      queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
    ]),
  });
}
