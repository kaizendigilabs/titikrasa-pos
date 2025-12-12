import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";

import {
  createMenuCategory,
  deleteMenuCategory,
  listMenuCategories,
  updateMenuCategory,
} from "./client";
import type { MenuCategoryFilters } from "./types";

const MENU_CATEGORIES_KEY = "menu-categories";

type MenuCategoriesQuery = Awaited<ReturnType<typeof listMenuCategories>>;

/**
 * Normalizes filter values for consistent query keys
 */
function normalizeFilters(filters: MenuCategoryFilters): MenuCategoryFilters {
  return {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    status: filters.status ?? "all",
    search: filters.search?.trim() ? filters.search.trim() : null,
  };
}

/**
 * Adjusts pagination total by delta
 */
function adjustMetaTotal(
  meta: MenuCategoriesQuery["meta"],
  delta: number,
): MenuCategoriesQuery["meta"] {
  if (!meta) return meta;
  const pagination = (meta as { pagination?: { total?: number } }).pagination;
  if (!pagination) return meta;
  const total = pagination.total ?? 0;
  return {
    ...meta,
    pagination: {
      ...pagination,
      total: Math.max(total + delta, 0),
    },
  };
}

/**
 * Hook for fetching menu categories list
 */
export function useMenuCategories(
  filters: MenuCategoryFilters,
  options: { initialData?: MenuCategoriesQuery } = {},
) {
  const normalizedFilters = normalizeFilters(filters);
  
  return useQuery({
    queryKey: [MENU_CATEGORIES_KEY, normalizedFilters],
    queryFn: () => listMenuCategories(normalizedFilters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.STATIC,
    retry: 1,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

/**
 * Hook for getting menu categories query key
 */
export function useMenuCategoriesQueryKey() {
  return useCallback((filters: MenuCategoryFilters = {}) => {
    return [MENU_CATEGORIES_KEY, normalizeFilters(filters)] as const;
  }, []);
}

/**
 * Hook for creating a menu category
 */
/**
 * Hook for creating a menu category
 */
export function useCreateMenuCategoryMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMenuCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MENU_CATEGORIES_KEY] });
      void queryClient.refetchQueries({
        queryKey: [MENU_CATEGORIES_KEY],
        type: "active",
      });
    },
  });
}

/**
 * Hook for updating a menu category
 */
export function useUpdateMenuCategoryMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      categoryId,
      input,
    }: {
      categoryId: string;
      input: Parameters<typeof updateMenuCategory>[1];
    }) => updateMenuCategory(categoryId, input),
    onMutate: async ({ categoryId, input }) => {
        await queryClient.cancelQueries({ queryKey: [MENU_CATEGORIES_KEY] });
        
        queryClient.setQueriesData({ queryKey: [MENU_CATEGORIES_KEY] }, (old: any) => {
           if (!old || !old.items) return old;
           return {
               ...old,
               items: old.items.map((item: any) => 
                   item.id === categoryId ? { ...item, ...input } : item
               )
           };
        });
    },
    onSuccess: () => {
       // Ideally no invalidation needed if optimistic is correct, but to be sure we can invalidate eventually
       // or just trust optimistic.
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [MENU_CATEGORIES_KEY] });
    }
  });
}

/**
 * Hook for deleting a menu category
 */
export function useDeleteMenuCategoryMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (categoryId: string) => deleteMenuCategory(categoryId),
    onMutate: async (categoryId) => {
        await queryClient.cancelQueries({ queryKey: [MENU_CATEGORIES_KEY] });
        
        queryClient.setQueriesData({ queryKey: [MENU_CATEGORIES_KEY] }, (old: any) => {
           if (!old || !old.items) return old;
           return {
               ...old,
               items: old.items.filter((item: any) => item.id !== categoryId),
               meta: adjustMetaTotal(old.meta, -1)
           };
        });
    },
    onSuccess: () => {
       // No invalidation needed
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [MENU_CATEGORIES_KEY] });
    }
  });
}
