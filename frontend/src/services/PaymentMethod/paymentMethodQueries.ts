import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import {
  createPaymentMethod, deletePaymentMethod, getPaymentMethod, getPaymentMethods, updatePaymentMethod, type SavePaymentMethodRequest,
} from './paymentMethodMethods';

export const paymentMethodKeys = {
  all: ['payment-methods'] as const,
  list: (status?: boolean) => [...paymentMethodKeys.all, 'list', status ?? 'all'] as const,
  detail: (id: number) => [...paymentMethodKeys.all, 'detail', id] as const,
};

const invalidate = () => queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all });

export function usePaymentMethods(status?: boolean) {
  return useQuery({ queryKey: paymentMethodKeys.list(status), queryFn: () => getPaymentMethods(status) });
}

export function usePaymentMethod(id: number) {
  return useQuery({ queryKey: paymentMethodKeys.detail(id), queryFn: () => getPaymentMethod(id), enabled: id > 0 });
}

export function useCreatePaymentMethod() {
  return useMutation({ mutationFn: (req: SavePaymentMethodRequest) => createPaymentMethod(req), onSuccess: invalidate });
}

export function useUpdatePaymentMethod() {
  return useMutation({
    mutationFn: ({ paymentMethodId, ...req }: SavePaymentMethodRequest & { paymentMethodId: number }) => updatePaymentMethod(paymentMethodId, req),
    onSuccess: invalidate,
  });
}

export function useDeletePaymentMethod() {
  return useMutation({ mutationFn: (id: number) => deletePaymentMethod(id), onSuccess: invalidate });
}
