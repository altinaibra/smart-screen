import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import { settingsKeys } from '../Settings/settingsQueries';
import {
  createCurrency, deleteCurrency, getCurrencies, getCurrency, setMainCurrency, updateCurrency, type SaveCurrencyRequest,
} from './currencyMethods';

export const currencyKeys = {
  all: ['currencies'] as const,
  list: (status?: boolean) => [...currencyKeys.all, 'list', status ?? 'all'] as const,
  detail: (id: number) => [...currencyKeys.all, 'detail', id] as const,
};

// Valuta kryesore shfaqet te çmimet, prandaj rifreskohen edhe cilësimet.
const invalidate = () => Promise.all([
  queryClient.invalidateQueries({ queryKey: currencyKeys.all }),
  queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
]);

export function useCurrencies(status?: boolean) {
  return useQuery({ queryKey: currencyKeys.list(status), queryFn: () => getCurrencies(status) });
}

export function useCurrency(id: number) {
  return useQuery({ queryKey: currencyKeys.detail(id), queryFn: () => getCurrency(id), enabled: id > 0 });
}

/** Valuta me isMainCurrency = true (null nëse asnjë valutë nuk është kryesore). */
export function useMainCurrency() {
  return useQuery({
    queryKey: currencyKeys.list(),
    queryFn: () => getCurrencies(),
    select: list => list.find(c => c.isMainCurrency) ?? null,
  });
}

export function useCreateCurrency() {
  return useMutation({ mutationFn: (req: SaveCurrencyRequest) => createCurrency(req), onSuccess: invalidate });
}

export function useUpdateCurrency() {
  return useMutation({
    mutationFn: ({ currencyId, ...req }: SaveCurrencyRequest & { currencyId: number }) => updateCurrency(currencyId, req),
    onSuccess: invalidate,
  });
}

export function useSetMainCurrency() {
  return useMutation({ mutationFn: (id: number) => setMainCurrency(id), onSuccess: invalidate });
}

export function useDeleteCurrency() {
  return useMutation({ mutationFn: (id: number) => deleteCurrency(id), onSuccess: invalidate });
}
