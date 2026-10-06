import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import { meKeys } from '../Business/businessQueries';
import { clearAlert, getSettings, setAlert, updateSettings } from './settingsMethods';
import type { BusinessType, SaveAlertRequest, Settings } from '../../types';

export const settingsKeys = {
  all: ['settings'] as const,
};

/** `currency` është gjithmonë simboli i valutës kryesore (isMainCurrency). */
export function useSettings() {
  return useQuery({ queryKey: settingsKeys.all, queryFn: getSettings });
}

/** Lloji i biznesit, për emërtimet që ndryshojnë: t('nav.menu', { context: businessType }). */
export function useBusinessType(): BusinessType {
  const { data } = useSettings();
  return data?.businessType ?? 'restaurant';
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: (settings: Settings) => updateSettings(settings),
    onSuccess: data => {
      queryClient.setQueryData(settingsKeys.all, data);
      // Emri dhe lloji i biznesit shfaqen edhe në zgjedhjen e biznesit.
      return queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}

/** Njoftimi urgjent në të gjitha ekranet e biznesit. */
export function useSetAlert() {
  return useMutation({
    mutationFn: (req: SaveAlertRequest) => setAlert(req),
    onSuccess: data => queryClient.setQueryData(settingsKeys.all, data),
  });
}

export function useClearAlert() {
  return useMutation({
    mutationFn: () => clearAlert(),
    onSuccess: data => queryClient.setQueryData(settingsKeys.all, data),
  });
}
