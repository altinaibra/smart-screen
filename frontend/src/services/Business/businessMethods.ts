import { api } from '../../api';
import type { Business, BusinessType, Me } from '../../types';

export const getMe = () => api<Me>('/auth/me');

export const createBusiness = (name: string, businessType: BusinessType) =>
  api<Business>('/businesses', { method: 'POST', json: { name, businessType } });

export const deleteBusiness = (id: number) => api(`/businesses/${id}`, { method: 'DELETE' });
