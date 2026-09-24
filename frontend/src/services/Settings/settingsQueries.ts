import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import { getSettings, updateSettings } from './settingsMethods';
import type { Settings } from '../../types';

export const settingsKeys = {
  all: ['settings'] as const,
};

/** `currency` është gjithmonë simboli i valutës kryesore (isMainCurrency). */
export function useSettings() {
  return useQuery({ queryKey: settingsKeys.all, queryFn: getSettings });
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: (settings: Settings) => updateSettings(settings),
    onSuccess: data => queryClient.setQueryData(settingsKeys.all, data),
  });
}
