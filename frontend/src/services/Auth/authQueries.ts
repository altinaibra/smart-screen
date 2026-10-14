import { useMutation } from '@tanstack/react-query';
import { auth } from '../../api';
import { queryClient } from '../queryClient';
import { changePassword, changeUsername, login } from './authMethods';

export function useLogin() {
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => login(username, password),
    onSuccess: res => {
      queryClient.clear(); // të dhënat e përdoruesit të mëparshëm
      auth.clear();
      auth.save(res.token, res.username);
    },
  });
}

export function useChangeUsername() {
  return useMutation({
    mutationFn: ({ currentPassword, newUsername }: { currentPassword: string; newUsername: string }) =>
      changeUsername(currentPassword, newUsername),
    onSuccess: res => {
      auth.save(res.token, res.username);
      return queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
  });
}
