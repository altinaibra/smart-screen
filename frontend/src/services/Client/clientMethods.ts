import { api } from '../../api';
import type { BusinessType, Client } from '../../types';

export interface SaveClientRequest {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive: boolean;
}

/** Klienti i ri krijohet bashkë me biznesin e parë dhe administratorin e tij. */
export interface CreateClientRequest extends Omit<SaveClientRequest, 'isActive'> {
  businessName: string;
  businessType: BusinessType;
  adminUsername: string;
  adminPassword: string;
}

export const getClients = () => api<Client[]>('/clients');

export const createClient = (req: CreateClientRequest) => api<Client>('/clients', { method: 'POST', json: req });

export const updateClient = (id: number, req: SaveClientRequest) => api<Client>(`/clients/${id}`, { method: 'PUT', json: req });

export const deleteClient = (id: number) => api(`/clients/${id}`, { method: 'DELETE' });
