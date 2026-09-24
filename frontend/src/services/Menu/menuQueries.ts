import { useMutation, useQuery } from '@tanstack/react-query';
import { dashboardKeys } from '../Dashboard/dashboardQueries';
import { queryClient } from '../queryClient';
import {
  createCategory, createProduct, deleteCategory, deleteProduct, getCategories, setProductAvailability, updateCategory, updateProduct,
  type SaveCategoryRequest, type SaveProductRequest,
} from './menuMethods';

export const menuKeys = {
  all: ['menu'] as const,
  categories: () => [...menuKeys.all, 'categories'] as const,
};

const invalidate = () => Promise.all([
  queryClient.invalidateQueries({ queryKey: menuKeys.all }),
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
]);

/** Kategoritë bashkë me produktet. */
export function useCategories() {
  return useQuery({ queryKey: menuKeys.categories(), queryFn: getCategories });
}

export function useSaveCategory() {
  return useMutation({
    mutationFn: ({ id, ...req }: SaveCategoryRequest & { id?: number }) => (id ? updateCategory(id, req) : createCategory(req)),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  return useMutation({ mutationFn: (id: number) => deleteCategory(id), onSuccess: invalidate });
}

export function useSaveProduct() {
  return useMutation({
    mutationFn: ({ id, ...req }: SaveProductRequest & { id?: number }) => (id ? updateProduct(id, req) : createProduct(req)),
    onSuccess: invalidate,
  });
}

export function useSetProductAvailability() {
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: number; isAvailable: boolean }) => setProductAvailability(id, isAvailable),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  return useMutation({ mutationFn: (id: number) => deleteProduct(id), onSuccess: invalidate });
}
