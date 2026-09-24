import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import { createClient, deleteClient, getClients, updateClient, type CreateClientRequest, type SaveClientRequest } from './clientMethods';

export const clientKeys = {
  all: ['clients'] as const,
};

const invalidate = () => queryClient.invalidateQueries({ queryKey: clientKeys.all });

export function useClients() {
  return useQuery({ queryKey: clientKeys.all, queryFn: getClients });
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
