import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import {
  createMenuCategory,
  deleteMenuCategory,
  listMenuCategories,
  updateMenuCategory,
} from "./api";
import type { MenuCategory } from "../types";
import type { MenuCategoryFilters } from "./forms/schema";
import { createBrowserClient } from "@/lib/supabase/client";

const MENU_CATEGORIES_KEY = "menu-categories";

type MenuCategoriesQuery = Awaited<ReturnType<typeof listMenuCategories>>;

function normalizeFilters(filters: MenuCategoryFilters): MenuCategoryFilters {
  return {
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

function updateCategoriesCache(
  queryClient: QueryClient,
  filters: MenuCategoryFilters,
  updater: (current: MenuCategoriesQuery) => MenuCategoriesQuery,
) {
  const key = [MENU_CATEGORIES_KEY, normalizeFilters(filters)] as const;
  queryClient.setQueryData<MenuCategoriesQuery>(key, (current) => {
    if (!current) return current;
    return updater(current);
  });
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

export function useCreateMenuCategoryMutation(filters: MenuCategoryFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMenuCategory,
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: [MENU_CATEGORIES_KEY, normalizeFilters(filters)],
      });
      const previous = queryClient.getQueryData<MenuCategoriesQuery>([
        MENU_CATEGORIES_KEY,
        normalizeFilters(filters),
      ]);
      if (previous) {
        const optimistic: MenuCategory = {
          id: `temp-${Date.now()}`,
          name: input.name,
          slug: input.slug,
          sort_order: input.sortOrder ?? previous.items.length,
          is_active: input.isActive ?? true,
          icon_url: input.iconUrl ?? null,
          created_at: new Date().toISOString(),
        };
        updateCategoriesCache(
          queryClient,
          filters,
          (current) => ({
            items: [optimistic, ...current.items],
            meta: adjustMetaTotal(current.meta, 1),
          }),
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [MENU_CATEGORIES_KEY, normalizeFilters(filters)],
          context.previous,
        );
      }
    },
    onSuccess: (category) => {
      updateCategoriesCache(
        queryClient,
        filters,
        (current) => ({
          items: [
            category,
            ...current.items.filter((item) => !item.id.startsWith("temp-")),
          ],
          meta: current.meta,
        }),
      );
    },
  });
}

export function useUpdateMenuCategoryMutation(filters: MenuCategoryFilters) {
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
      await queryClient.cancelQueries({
        queryKey: [MENU_CATEGORIES_KEY, normalizeFilters(filters)],
      });
      const previous = queryClient.getQueryData<MenuCategoriesQuery>([
        MENU_CATEGORIES_KEY,
        normalizeFilters(filters),
      ]);
      if (previous) {
        updateCategoriesCache(
          queryClient,
          filters,
          (current) => ({
            items: current.items.map((item) =>
              item.id === categoryId
                ? {
                    ...item,
                    name: input.name ?? item.name,
                    slug: input.slug ?? item.slug,
                    icon_url:
                      input.iconUrl === undefined ? item.icon_url : input.iconUrl,
                    sort_order:
                      input.sortOrder === undefined
                        ? item.sort_order
                        : input.sortOrder ?? item.sort_order,
                    is_active:
                      input.isActive === undefined
                        ? item.is_active
                        : input.isActive,
                  }
                : item,
            ),
            meta: current.meta,
          }),
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [MENU_CATEGORIES_KEY, normalizeFilters(filters)],
          context.previous,
        );
      }
    },
    onSuccess: (category) => {
      updateCategoriesCache(
        queryClient,
        filters,
        (current) => ({
          items: current.items.map((item) =>
            item.id === category.id ? category : item,
          ),
          meta: current.meta,
        }),
      );
    },
  });
}

export function useDeleteMenuCategoryMutation(filters: MenuCategoryFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => deleteMenuCategory(categoryId),
    onMutate: async (categoryId) => {
      await queryClient.cancelQueries({
        queryKey: [MENU_CATEGORIES_KEY, normalizeFilters(filters)],
      });
      const previous = queryClient.getQueryData<MenuCategoriesQuery>([
        MENU_CATEGORIES_KEY,
        normalizeFilters(filters),
      ]);
      if (previous) {
        updateCategoriesCache(
          queryClient,
          filters,
          (current) => {
            const exists = current.items.some(
              (item) => item.id === categoryId,
            );
            if (!exists) return current;
            return {
              items: current.items.filter((item) => item.id !== categoryId),
              meta: adjustMetaTotal(current.meta, -1),
            };
          },
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [MENU_CATEGORIES_KEY, normalizeFilters(filters)],
          context.previous,
        );
      }
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
