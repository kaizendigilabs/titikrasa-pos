import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import {
  createMenu,
  deleteMenu,
  listMenus,
  publishMenu,
  updateMenu,
} from "./client";
import { mapMenuRow, type RawMenuRow } from "./mappers";
import type { MenuFilters, MenuListItem } from "./types";
import { toPersistedVariants, cloneVariantsConfig } from "./utils";
import type { MenuVariantsInput } from "./schemas";
import { createBrowserClient } from "@/lib/supabase/client";

const MENUS_KEY = "menus";

type MenusQueryResult = Awaited<ReturnType<typeof listMenus>>;

type CreateMenuInput = Parameters<typeof createMenu>[0];

function normalizeFilters(filters: MenuFilters): MenuFilters {
  return {
    status: filters.status ?? "all",
    search: filters.search?.trim() ? filters.search.trim() : null,
    categoryId: filters.categoryId ?? null,
    type: filters.type ?? "all",
  };
}

function updateMenusCache(
  client: QueryClient,
  filters: MenuFilters,
  updater: (current: MenusQueryResult) => MenusQueryResult,
) {
  const key = [MENUS_KEY, normalizeFilters(filters)] as const;
  client.setQueryData<MenusQueryResult>(key, (current) => {
    if (!current) return current;
    return updater(current);
  });
}

function buildOptimisticMenu(
  input: CreateMenuInput,
): MenuListItem {
  const base: RawMenuRow = {
    id: `temp-${Date.now()}`,
    name: input.name,
    sku: input.sku ?? null,
    category_id: input.categoryId ?? null,
    categories: null,
    price: input.type === "simple" ? input.price : null,
    reseller_price:
      input.type === "simple" ? input.resellerPrice ?? null : null,
    is_active: input.isActive ?? true,
    thumbnail_url: input.thumbnailUrl ?? null,
    variants:
      input.type === "variant"
        ? toPersistedVariants(input.variants as MenuVariantsInput)
        : null,
    created_at: new Date().toISOString(),
  };

  return mapMenuRow(base);
}

export function useMenus(
  filters: MenuFilters,
  options: { initialData?: MenusQueryResult } = {},
) {
  const normalized = normalizeFilters(filters);
  return useQuery({
    queryKey: [MENUS_KEY, normalized],
    queryFn: () => listMenus(normalized),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

export function useMenusQueryKey() {
  return React.useCallback((filters: MenuFilters = {}) => {
    return [MENUS_KEY, normalizeFilters(filters)] as const;
  }, []);
}

export function useCreateMenuMutation(filters: MenuFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMenu,
    onMutate: async (input) => {
      const key = [MENUS_KEY, normalizeFilters(filters)] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MenusQueryResult>(key);
      if (previous) {
        const optimistic = buildOptimisticMenu(input);
        queryClient.setQueryData<MenusQueryResult>(key, {
          items: [optimistic, ...previous.items],
          meta: previous.meta,
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      const key = [MENUS_KEY, normalizeFilters(filters)] as const;
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: (menu) => {
      updateMenusCache(queryClient, filters, (current) => {
        const withoutTemp = current.items.filter(
          (item) => !item.id.startsWith("temp-"),
        );
        const exists = withoutTemp.some((item) => item.id === menu.id);
        return {
          items: exists
            ? withoutTemp.map((item) => (item.id === menu.id ? menu : item))
            : [menu, ...withoutTemp],
          meta: current.meta,
        };
      });
    },
  });
}

export function useUpdateMenuMutation(filters: MenuFilters) {
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
      const key = [MENUS_KEY, normalizeFilters(filters)] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MenusQueryResult>(key);
      if (previous) {
        queryClient.setQueryData<MenusQueryResult>(key, {
          items: previous.items.map((item) => {
            if (item.id !== menuId) return item;
            let nextVariants = cloneVariantsConfig(item.variants);
            if (input.type === "simple") {
              nextVariants = null;
            } else if (input.variants !== undefined) {
              nextVariants = toPersistedVariants(
                input.variants as MenuVariantsInput,
              );
            }

            const next: MenuListItem = {
              ...item,
              name: input.name ?? item.name,
              sku:
                input.sku === undefined
                  ? item.sku
                  : input.sku,
              category_id:
                input.categoryId === undefined
                  ? item.category_id
                  : input.categoryId,
              thumbnail_url:
                input.thumbnailUrl === undefined
                  ? item.thumbnail_url
                  : input.thumbnailUrl,
              is_active:
                input.isActive === undefined
                  ? item.is_active
                  : input.isActive,
              price:
                input.price === undefined ? item.price : input.price ?? null,
              reseller_price:
                input.resellerPrice === undefined
                  ? item.reseller_price
                  : input.resellerPrice ?? null,
              type: input.type ?? item.type,
              variants: nextVariants,
              default_retail_price:
                input.price === undefined
                  ? item.default_retail_price
                  : input.price ?? null,
              default_reseller_price:
                input.resellerPrice === undefined
                  ? item.default_reseller_price
                  : input.resellerPrice ?? null,
            };
            return next;
          }),
          meta: previous.meta,
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      const key = [MENUS_KEY, normalizeFilters(filters)] as const;
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: (menu) => {
      updateMenusCache(queryClient, filters, (current) => ({
        items: current.items.map((item) =>
          item.id === menu.id ? menu : item,
        ),
        meta: current.meta,
      }));
    },
  });
}

export function useDeleteMenuMutation(filters: MenuFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (menuId: string) => deleteMenu(menuId),
    onMutate: async (menuId) => {
      const key = [MENUS_KEY, normalizeFilters(filters)] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MenusQueryResult>(key);
      if (previous) {
        queryClient.setQueryData<MenusQueryResult>(key, {
          items: previous.items.filter((item) => item.id !== menuId),
          meta: previous.meta,
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      const key = [MENUS_KEY, normalizeFilters(filters)] as const;
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
  });
}

export function useToggleMenuStatusMutation(filters: MenuFilters) {
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
      const key = [MENUS_KEY, normalizeFilters(filters)] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MenusQueryResult>(key);
      if (previous) {
        queryClient.setQueryData<MenusQueryResult>(key, {
          items: previous.items.map((item) =>
            item.id === menuId
              ? { ...item, is_active: isActive }
              : item,
          ),
          meta: previous.meta,
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      const key = [MENUS_KEY, normalizeFilters(filters)] as const;
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: (menu) => {
      updateMenusCache(queryClient, filters, (current) => ({
        items: current.items.map((item) =>
          item.id === menu.id ? menu : item,
        ),
        meta: current.meta,
      }));
    },
  });
}

export function useMenusRealtime(
  filters: MenuFilters,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const queryClient = useQueryClient();
  const normalized = normalizeFilters(filters);

  React.useEffect(() => {
    if (!enabled) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("menus-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menus" },
        (payload) => {
          queryClient.setQueryData<MenusQueryResult>(
            [MENUS_KEY, normalized],
            (current) => {
              if (!current) return current;
              const newRow = (payload.new ??
                payload.old ??
                {}) as RawMenuRow;
              const mapped = mapMenuRow({
                ...newRow,
                categories: null,
              });

              if (payload.eventType === "DELETE") {
                return {
                  items: current.items.filter(
                    (item) => item.id !== String(newRow.id ?? ""),
                  ),
                  meta: current.meta,
                };
              }

              const exists = current.items.some(
                (item) => item.id === mapped.id,
              );

              if (exists) {
                return {
                  items: current.items.map((item) =>
                    item.id === mapped.id ? mapped : item,
                  ),
                  meta: current.meta,
                };
              }

              return {
                items: [mapped, ...current.items],
                meta: current.meta,
              };
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, normalized, queryClient]);
}
