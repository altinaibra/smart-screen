import { api } from '../../api';
import type { Category, Product } from '../../types';

export interface SaveCategoryRequest {
  name: string;
  sortOrder: number;
}

export type SaveProductRequest = Omit<Product, 'id' | 'imageUrl'>;

export const getCategories = () => api<Category[]>('/menu/categories');

export const createCategory = (req: SaveCategoryRequest) => api<Category>('/menu/categories', { method: 'POST', json: req });

export const updateCategory = (id: number, req: SaveCategoryRequest) => api<Category>(`/menu/categories/${id}`, { method: 'PUT', json: req });

export const deleteCategory = (id: number) => api(`/menu/categories/${id}`, { method: 'DELETE' });

export const createProduct = (req: SaveProductRequest) => api<Product>('/menu/products', { method: 'POST', json: req });

export const updateProduct = (id: number, req: SaveProductRequest) => api<Product>(`/menu/products/${id}`, { method: 'PUT', json: req });

export const setProductAvailability = (id: number, isAvailable: boolean) =>
  api(`/menu/products/${id}/availability`, { method: 'PATCH', json: { isAvailable } });

export const deleteProduct = (id: number) => api(`/menu/products/${id}`, { method: 'DELETE' });
