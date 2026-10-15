import { api } from '../../api';
import type { BusinessType, Client } from '../../types';

export interface SaveClientRequest {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive: boolean;
  /** Opsionale: ndryshon llogarinë me të cilën hyn klienti (bosh = pa ndryshim). */
  adminUsername?: string;
  adminPassword?: string;
}

/** Klienti i ri krijohet bashkë me biznesin e parë dhe administratorin e tij. */
export interface CreateClientRequest extends Omit<SaveClientRequest, 'isActive' | 'adminUsername' | 'adminPassword'> {
  businessName: string;
  businessType: BusinessType;
  adminUsername: string;
  adminPassword: string;
}

export const getClients = () => api<Client[]>('/clients');

export const createClient = (req: CreateClientRequest) => api<Client>('/clients', { method: 'POST', json: req });

export const updateClient = (id: number, req: SaveClientRequest) => api<Client>(`/clients/${id}`, { method: 'PUT', json: req });

/** Llogaritë e klientit; password = null kur fjalëkalimi nuk dihet (vendosur para këtij versioni). */
export interface ClientLogin { id: number; username: string; role: string; password: string | null }

export interface ClientBusiness { id: number; name: string; businessType: BusinessType; screenCount: number; screensOnline: number }

export const getClientBusinesses = (id: number) => api<ClientBusiness[]>(`/clients/${id}/businesses`);

export const getClientLogins = (id: number) => api<ClientLogin[]>(`/clients/${id}/logins`);

/** Ndryshon një llogari të klientit; vlerat bosh nuk ndryshohen. */
export const updateClientLogin = (clientId: number, userId: number, req: { username?: string; password?: string }) =>
  api<ClientLogin>(`/clients/${clientId}/logins/${userId}`, { method: 'PUT', json: req });

export const deleteClient = (id: number) => api(`/clients/${id}`, { method: 'DELETE' });
