import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import { createClient, deleteClient, getClientLogins, getClients, updateClient, type CreateClientRequest, type SaveClientRequest } from './clientMethods';

export const clientKeys = {
  all: ['clients'] as const,
};

const invalidate = () => queryClient.invalidateQueries({ queryKey: clientKeys.all });

export function useClients() {
  return useQuery({ queryKey: clientKeys.all, queryFn: getClients });
}

/** Përdoruesit dhe fjalëkalimet e klientit – ngarkohen vetëm kur pronari i kërkon. */
export function useClientLogins(id: number, enabled: boolean) {
  return useQuery({ queryKey: [...clientKeys.all, id, 'logins'], queryFn: () => getClientLogins(id), enabled });
}

export function useCreateClient() {
  return useMutation({ mutationFn: (req: CreateClientRequest) => createClient(req), onSuccess: invalidate });
}

export function useUpdateClient() {
  return useMutation({
    mutationFn: ({ id, ...req }: SaveClientRequest & { id: number }) => updateClient(id, req),
    onSuccess: invalidate,
  });
}

export function useDeleteClient() {
  return useMutation({ mutationFn: (id: number) => deleteClient(id), onSuccess: invalidate });
}
