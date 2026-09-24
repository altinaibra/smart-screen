import { useMutation, useQuery } from '@tanstack/react-query';
import { auth } from '../../api';
import { queryClient } from '../queryClient';
import { createBusiness, deleteBusiness, getMe } from './businessMethods';
import type { Business, BusinessType } from '../../types';

export const meKeys = {
  all: ['me'] as const,
};

/** Përdoruesi aktual dhe bizneset që sheh. */
export function useMe() {
  return useQuery({ queryKey: meKeys.all, queryFn: getMe, staleTime: 60_000 });
}

/**
 * Biznesi i zgjedhur në panel. Nëse ai i ruajturi nuk lejohet më (p.sh. u fshi ose iu hoq qasja),
 * zgjidhet i pari nga lista.
 */
export function useCurrentBusiness(): Business | null {
  const { data } = useMe();
  if (!data || data.businesses.length === 0) return null;
  const current = data.businesses.find(b => b.id === auth.businessId) ?? data.businesses[0];
  if (auth.businessId !== current.id) auth.businessId = current.id;
  return current;
}

/** Ndërron biznesin: të gjitha të dhënat e tjera (ekranet, playlistat...) ngarkohen sërish. */
export function switchBusiness(id: number) {
  auth.businessId = id;
  return queryClient.resetQueries({ predicate: q => q.queryKey[0] !== meKeys.all[0] });
}

/** Pronari hyn në një klient (ose del, me null): gjithë paneli ngarkohet sërish për atë klient. */
export function enterClient(id: number | null) {
  auth.clientId = id;
  auth.businessId = null;
  // Të dhënat e klientit të mëparshëm hiqen (jo ringarkohen, që faqja që po mbyllet të mos i kërkojë pa klient).
  // Lista e klientëve i përket pronarit dhe mbetet.
  queryClient.removeQueries({ predicate: q => q.queryKey[0] !== meKeys.all[0] && q.queryKey[0] !== 'clients' });
  return queryClient.resetQueries({ queryKey: meKeys.all });
}

const invalidateMe = () => queryClient.invalidateQueries({ queryKey: meKeys.all });

export function useCreateBusiness() {
  return useMutation({
    mutationFn: ({ name, businessType }: { name: string; businessType: BusinessType }) => createBusiness(name, businessType),
    onSuccess: invalidateMe,
  });
}

export function useDeleteBusiness() {
  return useMutation({ mutationFn: (id: number) => deleteBusiness(id), onSuccess: invalidateMe });
}
