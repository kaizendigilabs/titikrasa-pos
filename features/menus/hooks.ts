import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import {
  createMenu,
  deleteMenu,
  getMenu,
  listMenus,
  publishMenu,
  updateMenu,
} from "./client";
import { mapMenuRow, type RawMenuRow } from "./mappers";
import type { MenuFilters } from "./types";
import { createBrowserClient } from "@/lib/supabase/client";

const MENUS_KEY = "menus";

type MenusQueryResult = Awaited<ReturnType<typeof listMenus>>;

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
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}

export function useCreateMenuMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMenu,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MENUS_KEY] });
    },
  });
}

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MENUS_KEY] });
    },
  });
}

export function useDeleteMenuMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (menuId: string) => deleteMenu(menuId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MENUS_KEY] });
    },
  });
}

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MENUS_KEY] });
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
