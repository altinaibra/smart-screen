import { useMutation, useQuery } from '@tanstack/react-query';
import { dashboardKeys } from '../Dashboard/dashboardQueries';
import { playlistKeys } from '../Playlist/playlistQueries';
import { queryClient } from '../queryClient';
import { deleteScreen, getScreenLink, getScreens, getServerInfo, pairScreen, reloadScreen, replaceDevice, updateScreen, type PairScreenRequest, type UpdateScreenRequest } from './screenMethods';

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

export function useReplaceDevice() {
  return useMutation({
    mutationFn: ({ id, pairingCode }: { id: number; pairingCode: string }) => replaceDevice(id, pairingCode),
    onSuccess: invalidate,
  });
}

/**
 * Linku i player-it për një ekran me adresën që e arrijnë TV-të (IP-ja e serverit, jo "localhost"):
 * open() e hap në skedë të re, url() e kthen (p.sh. për ta kopjuar).
 */
export function useScreenLink() {
  const { data: serverInfo } = useServerInfo();
  const url = async (id: number) => (serverInfo?.addresses[0] ?? location.origin) + (await getScreenLink(id)).path;
  const open = async (id: number) => {
    // Dritarja hapet para await, që shfletuesi të mos e bllokojë si pop-up.
    const win = window.open('about:blank', '_blank');
    try {
      const link = await url(id);
      if (win) win.location.href = link; else location.href = link;
    } catch (e) { win?.close(); throw e; }
  };
  return { url, open };
}
