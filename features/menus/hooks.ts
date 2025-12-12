import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";

import {
  createMenu,
  deleteMenu,
  getMenu,
  listMenus,
  publishMenu,
  updateMenu,
} from "./client";

import type { MenuFilters } from "./types";

const MENUS_KEY = "menus";

type MenusQueryResult = Awaited<ReturnType<typeof listMenus>>;

/**
 * Normalizes filter values for consistent query keys
 */
function normalizeFilters(filters: MenuFilters): MenuFilters {
  return {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    status: filters.status ?? "all",
    search: filters.search?.trim() ? filters.search.trim() : null,
    categoryId: filters.categoryId ?? null,
    type: filters.type ?? "all",
  };
}

/**
 * Hook for fetching menus list
 */
export function useMenus(
  filters: MenuFilters,
  options: { initialData?: MenusQueryResult } = {},
) {
  const normalized = normalizeFilters(filters);
  
  return useQuery({
    queryKey: [MENUS_KEY, normalized],
    queryFn: () => listMenus(normalized),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.STATIC,
    retry: 1,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

/**
 * Hook for getting menus query key
 */
export function useMenusQueryKey() {
  return useCallback((filters: MenuFilters = {}) => {
    return [MENUS_KEY, normalizeFilters(filters)] as const;
  }, []);
}

/**
 * Hook for fetching single menu detail
 */
export function useMenuDetail(menuId: string | null, options?: { enabled?: boolean }) {
  const enabled = (options?.enabled ?? true) && Boolean(menuId);
  
  return useQuery({
    queryKey: ["menu-detail", menuId],
    queryFn: () => {
      if (!menuId) {
        throw new Error("Menu ID is required");
      }
      return getMenu(menuId);
    },
    enabled,
    ...CACHE_POLICIES.STATIC,
    retry: 1,
  });
}

/**
 * Hook for creating a new menu
 */
/**
 * Hook for creating a new menu
 */
export function useCreateMenuMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMenu,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MENUS_KEY] });
      void queryClient.refetchQueries({
        queryKey: [MENUS_KEY],
        type: "active",
      });
    },
  });
}

/**
 * Hook for updating a menu
 */
export function useUpdateMenuMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      menuId,
      input,
    }: {
      menuId: string;
      input: Parameters<typeof updateMenu>[1];
    }) => updateMenu(menuId, input),
    onMutate: async ({ menuId, input }) => {
        await queryClient.cancelQueries({ queryKey: [MENUS_KEY] });
        
        // Optimistic update for lists
        queryClient.setQueriesData({ queryKey: [MENUS_KEY] }, (old: any) => {
            if (!old || !old.items) return old;
            return {
                ...old,
                items: old.items.map((item: any) => 
                    item.id === menuId ? { ...item, ...input } : item
                )
            };
        });

        // Optimistic update for detail
        const detailKey = ["menu-detail", menuId];
        await queryClient.cancelQueries({ queryKey: detailKey });
        const previousDetail = queryClient.getQueryData(detailKey);

        if (previousDetail) {
            queryClient.setQueryData(detailKey, (old: any) => ({
                ...old,
                ...input
            }));
        }

        return { previousDetail };
    },
    onSuccess: () => {
       // No invalidation needed
    },
    onError: (_err, _vars, context) => {
        void queryClient.invalidateQueries({ queryKey: [MENUS_KEY] });
        if (context?.previousDetail) {
            queryClient.setQueryData(["menu-detail", _vars.menuId], context.previousDetail);
        }
    }
  });
}

/**
 * Hook for deleting a menu
 */
export function useDeleteMenuMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (menuId: string) => deleteMenu(menuId),
    onMutate: async (menuId) => {
        await queryClient.cancelQueries({ queryKey: [MENUS_KEY] });
        
        queryClient.setQueriesData({ queryKey: [MENUS_KEY] }, (old: any) => {
           if (!old || !old.items) return old;
           return {
               ...old,
               items: old.items.filter((item: any) => item.id !== menuId)
           };
        });
    },
    onSuccess: () => {
       // No invalidation needed
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [MENUS_KEY] });
    }
  });
}

/**
 * Hook for toggling menu status
 */
export function useToggleMenuStatusMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      menuId,
      isActive,
    }: {
      menuId: string;
      isActive: boolean;
    }) => publishMenu(menuId, isActive),
    onMutate: async ({ menuId, isActive }) => {
        await queryClient.cancelQueries({ queryKey: [MENUS_KEY] });
        
        // Optimistic update for lists
        queryClient.setQueriesData({ queryKey: [MENUS_KEY] }, (old: any) => {
            if (!old || !old.items) return old;
            return {
                ...old,
                items: old.items.map((item: any) => 
                    item.id === menuId ? { ...item, isActive } : item
                )
            };
        });

         // Optimistic update for detail
         const detailKey = ["menu-detail", menuId];
         await queryClient.cancelQueries({ queryKey: detailKey });
         const previousDetail = queryClient.getQueryData(detailKey);
 
         if (previousDetail) {
             queryClient.setQueryData(detailKey, (old: any) => ({
                 ...old,
                 isActive
             }));
         }
 
         return { previousDetail };
    },
    onSuccess: () => {
       // No invalidation needed
    },
    onError: (_err, _vars, context) => {
        void queryClient.invalidateQueries({ queryKey: [MENUS_KEY] });
        if (context?.previousDetail) {
            queryClient.setQueryData(["menu-detail", _vars.menuId], context.previousDetail);
        }
    }
  });
}
