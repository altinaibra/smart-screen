import { api } from '../../api';
import type { PaymentMethod } from '../../types';

export type SavePaymentMethodRequest = Omit<PaymentMethod, 'paymentMethodId' | 'entryDate'>;

export const getPaymentMethods = (status?: boolean) =>
  api<PaymentMethod[]>(`/payment-methods${status === undefined ? '' : `?status=${status}`}`);

export const getPaymentMethod = (id: number) => api<PaymentMethod>(`/payment-methods/${id}`);

export const createPaymentMethod = (req: SavePaymentMethodRequest) =>
  api<PaymentMethod>('/payment-methods', { method: 'POST', json: req });

export const updatePaymentMethod = (id: number, req: SavePaymentMethodRequest) =>
  api<PaymentMethod>(`/payment-methods/${id}`, { method: 'PUT', json: req });

export const deletePaymentMethod = (id: number) => api(`/payment-methods/${id}`, { method: 'DELETE' });
