import { useMutation, useQuery } from '@tanstack/react-query';
import { dashboardKeys } from '../Dashboard/dashboardQueries';
import { playlistKeys } from '../Playlist/playlistQueries';
import { queryClient } from '../queryClient';
import { deleteScreen, getScreens, getServerInfo, pairScreen, reloadScreen, updateScreen, type PairScreenRequest, type UpdateScreenRequest } from './screenMethods';

export const screenKeys = {
  all: ['screens'] as const,
  serverInfo: ['server-info'] as const,
};

const invalidate = () => Promise.all([
  queryClient.invalidateQueries({ queryKey: screenKeys.all }),
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  queryClient.invalidateQueries({ queryKey: playlistKeys.all }), // numri i ekraneve për playlist
]);

/** Rifreskohet çdo 15 sekonda (statusi online/offline). */
export function useScreens() {
  return useQuery({ queryKey: screenKeys.all, queryFn: getScreens, refetchInterval: 15_000 });
}

export function useServerInfo() {
  return useQuery({ queryKey: screenKeys.serverInfo, queryFn: getServerInfo, staleTime: Infinity });
}

export function usePairScreen() {
  return useMutation({ mutationFn: (req: PairScreenRequest) => pairScreen(req), onSuccess: invalidate });
}

export function useUpdateScreen() {
  return useMutation({
    mutationFn: ({ id, ...req }: UpdateScreenRequest & { id: number }) => updateScreen(id, req),
    onSuccess: invalidate,
  });
}

export function useReloadScreen() {
  return useMutation({ mutationFn: (id: number) => reloadScreen(id) });
}

export function useDeleteScreen() {
  return useMutation({ mutationFn: (id: number) => deleteScreen(id), onSuccess: invalidate });
}
