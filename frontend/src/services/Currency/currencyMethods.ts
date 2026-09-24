import { api } from '../../api';
import type { Currency } from '../../types';

export type SaveCurrencyRequest = Omit<Currency, 'currencyId' | 'entryDate'>;

export const getCurrencies = (status?: boolean) =>
  api<Currency[]>(`/currencies${status === undefined ? '' : `?status=${status}`}`);

export const getCurrency = (id: number) => api<Currency>(`/currencies/${id}`);

export const createCurrency = (req: SaveCurrencyRequest) => api<Currency>('/currencies', { method: 'POST', json: req });

export const updateCurrency = (id: number, req: SaveCurrencyRequest) => api<Currency>(`/currencies/${id}`, { method: 'PUT', json: req });

/** E bën valutën kryesore (isMainCurrency = true); hiqet nga të tjerat. */
export const setMainCurrency = (id: number) => api<Currency>(`/currencies/${id}/main`, { method: 'PUT' });

export const deleteCurrency = (id: number) => api(`/currencies/${id}`, { method: 'DELETE' });
