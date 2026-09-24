import { useMutation } from '@tanstack/react-query';
import { auth } from '../../api';
import { queryClient } from '../queryClient';
import { changePassword, login } from './authMethods';

export function useLogin() {
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => login(username, password),
    onSuccess: res => {
      queryClient.clear(); // të dhënat e përdoruesit të mëparshëm
      auth.save(res.token, res.username);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
  });
}
