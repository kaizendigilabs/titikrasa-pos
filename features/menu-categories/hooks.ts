import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import {
  createMenuCategory,
  deleteMenuCategory,
  listMenuCategories,
  updateMenuCategory,
} from "./client";
import type { MenuCategory, MenuCategoryFilters } from "./types";
import { createBrowserClient } from "@/lib/supabase/client";

const MENU_CATEGORIES_KEY = "menu-categories";

type MenuCategoriesQuery = Awaited<ReturnType<typeof listMenuCategories>>;

function normalizeFilters(filters: MenuCategoryFilters): MenuCategoryFilters {
  return {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    status: filters.status ?? "all",
    search: filters.search?.trim()
      ? filters.search.trim()
      : null,
  };
}

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

export function useMenuCategories(
  filters: MenuCategoryFilters,
  options: { initialData?: MenuCategoriesQuery } = {},
) {
  const normalizedFilters = normalizeFilters(filters);
  return useQuery({
    queryKey: [MENU_CATEGORIES_KEY, normalizedFilters],
    queryFn: () => listMenuCategories(normalizedFilters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

export function useMenuCategoriesQueryKey() {
  return React.useCallback((filters: MenuCategoryFilters = {}) => {
    return [MENU_CATEGORIES_KEY, normalizeFilters(filters)] as const;
  }, []);
}

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MENU_CATEGORIES_KEY] });
      void queryClient.refetchQueries({
        queryKey: [MENU_CATEGORIES_KEY],
        type: "active",
      });
    },
  });
}

export function useDeleteMenuCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => deleteMenuCategory(categoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MENU_CATEGORIES_KEY] });
      void queryClient.refetchQueries({
        queryKey: [MENU_CATEGORIES_KEY],
        type: "active",
      });
    },
  });
}

export function useMenuCategoriesRealtime(
  filters: MenuCategoryFilters,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const queryClient = useQueryClient();
  const normalizedFilters = normalizeFilters(filters);

  React.useEffect(() => {
    if (!enabled) return;
    const supabase = createBrowserClient();

    const channel = supabase
      .channel("menu-categories-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        (payload) => {
          queryClient.setQueryData<MenuCategoriesQuery>(
            [MENU_CATEGORIES_KEY, normalizedFilters],
            (current) => {
              if (!current) return current;

              const newRow = (payload.new ??
                payload.old ??
                {}) as Record<string, unknown>;

              const category: MenuCategory = {
                id: String(newRow.id ?? ""),
                name: String(newRow.name ?? ""),
                slug: String(newRow.slug ?? ""),
                sort_order: Number(newRow.sort_order ?? 0),
                is_active: Boolean(newRow.is_active ?? true),
                icon_url:
                  typeof newRow.icon_url === "string"
                    ? (newRow.icon_url as string)
                    : null,
                created_at:
                  typeof newRow.created_at === "string"
                    ? (newRow.created_at as string)
                    : new Date().toISOString(),
              };

              if (payload.eventType === "DELETE") {
                return {
                  items: current.items.filter(
                    (item) => item.id !== category.id,
                  ),
                  meta: adjustMetaTotal(current.meta, -1),
                };
              }

              const exists = current.items.some(
                (item) => item.id === category.id,
              );
              if (exists) {
                return {
                  items: current.items.map((item) =>
                    item.id === category.id ? category : item,
                  ),
                  meta: current.meta,
                };
              }

              return {
                items: [category, ...current.items],
                meta: adjustMetaTotal(current.meta, 1),
              };
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, normalizedFilters, queryClient]);
}
