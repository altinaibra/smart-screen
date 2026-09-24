import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import { meKeys } from '../Business/businessQueries';
import { createUser, deleteUser, getAccessOptions, getUsers, updateUser, type SaveUserRequest } from './userMethods';

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  accessOptions: () => [...userKeys.all, 'access-options'] as const,
};

// Ndryshimi i vetvetes (p.sh. emri) duket edhe te përdoruesi aktual.
const invalidate = () => Promise.all([
  queryClient.invalidateQueries({ queryKey: userKeys.all }),
  queryClient.invalidateQueries({ queryKey: meKeys.all }),
]);

export function useUsers() {
  return useQuery({ queryKey: userKeys.list(), queryFn: getUsers });
}

export function useAccessOptions() {
  return useQuery({ queryKey: userKeys.accessOptions(), queryFn: getAccessOptions });
}

export function useCreateUser() {
  return useMutation({ mutationFn: (req: SaveUserRequest) => createUser(req), onSuccess: invalidate });
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: ({ id, ...req }: SaveUserRequest & { id: number }) => updateUser(id, req),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  return useMutation({ mutationFn: (id: number) => deleteUser(id), onSuccess: invalidate });
}
