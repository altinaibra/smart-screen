import { useQuery } from '@tanstack/react-query';
import { getDashboard } from './dashboardMethods';

export const dashboardKeys = {
  all: ['dashboard'] as const,
};

/** Rifreskohet çdo 15 sekonda (statusi online/offline i ekraneve). */
export function useDashboard() {
  return useQuery({ queryKey: dashboardKeys.all, queryFn: getDashboard, refetchInterval: 15_000 });
}
