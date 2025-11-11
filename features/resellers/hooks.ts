import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import {
  createReseller,
  deleteReseller,
  listResellerCatalog,
  listResellerOrders,
  listResellers,
  toggleResellerStatus,
  updateReseller,
  type ResellerListMeta,
} from "./client";
import type {
  ResellerCatalogFilters,
  ResellerFilters,
  ResellerOrderFilters,
  UpdateResellerPayload,
} from "./schemas";
import type {
  ResellerCatalogEntry,
  ResellerListItem,
  ResellerOrder,
} from "./types";
import { parseContact, parseTerms } from "./types";
import { createBrowserClient } from "@/lib/supabase/client";
import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";

const RESELLERS_KEY = "resellers";
const RESELLER_ORDERS_KEY = "reseller-orders";
const RESELLER_CATALOG_KEY = "reseller-catalog";

type UseResellersOptions = {
  initialData?: Awaited<ReturnType<typeof listResellers>>;
};

type ResellersQuerySnapshot = {
  items: ResellerListItem[];
  meta: ResellerListMeta | null;
};

function adjustMetaTotal(
  meta: ResellerListMeta | null,
  delta: number,
): ResellerListMeta | null {
  if (!meta) return meta;
  const pagination = meta.pagination ?? null;
  if (!pagination) return meta;
  const nextTotal = Math.max(0, (pagination.total ?? 0) + delta);
  return {
    ...meta,
    pagination: {
      ...pagination,
      total: nextTotal,
    },
  };
}

function updateResellersCache(
  queryClient: QueryClient,
  updater: (current: ResellersQuerySnapshot) => ResellersQuerySnapshot,
) {
  queryClient.setQueriesData<ResellersQuerySnapshot | undefined>(
    { queryKey: [RESELLERS_KEY] },
    (current) => {
      if (!current) return current;
      return updater(current);
    },
  );
}

export function useResellers(filters: ResellerFilters, options: UseResellersOptions = {}) {
  return useQuery({
    queryKey: [RESELLERS_KEY, filters],
    queryFn: () => listResellers(filters),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

export function useCreateResellerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReseller,
    onSuccess: (reseller) => {
      updateResellersCache(queryClient, (current) => {
        const exists = current.items.some((item) => item.id === reseller.id);
        const items = exists
          ? current.items.map((item) =>
              item.id === reseller.id ? reseller : item,
            )
          : [reseller, ...current.items];
        const meta = adjustMetaTotal(current.meta, exists ? 0 : 1);
        return { items, meta };
      });
    },
  });
}

export function useUpdateResellerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resellerId, input }: { resellerId: string; input: UpdateResellerPayload }) =>
      updateReseller(resellerId, input),
    onSuccess: (reseller) => {
      updateResellersCache(queryClient, (current) => ({
        items: current.items.map((item) =>
          item.id === reseller.id ? reseller : item,
        ),
        meta: current.meta,
      }));
    },
  });
}

export function useToggleResellerStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      resellerId,
      isActive,
    }: {
      resellerId: string;
      isActive: boolean;
    }) => toggleResellerStatus(resellerId, isActive),
    onSuccess: (reseller) => {
      updateResellersCache(queryClient, (current) => ({
        items: current.items.map((item) =>
          item.id === reseller.id ? reseller : item,
        ),
        meta: current.meta,
      }));
    },
  });
}

export function useDeleteResellerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resellerId: string) => deleteReseller(resellerId),
    onSuccess: (_result, resellerId) => {
      updateResellersCache(queryClient, (current) => {
        const nextItems = current.items.filter((item) => item.id !== resellerId);
        if (nextItems.length === current.items.length) {
          return current;
        }
        return {
          items: nextItems,
          meta: adjustMetaTotal(current.meta, -1),
        };
      });
    },
  });
}

type RealtimeOptions = {
  onUpsert?: (reseller: ResellerListItem) => void;
  onDelete?: (resellerId: string) => void;
};

export function useResellersRealtime(enabled: boolean, options: RealtimeOptions = {}) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("resellers-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resellers" },
        (payload) => {
          const newRow = (payload.new ?? {}) as Record<string, unknown>;
          const oldRow = (payload.old ?? {}) as Record<string, unknown>;

          const contactJson =
            (newRow.contact as unknown) ?? (oldRow.contact as unknown) ?? null;
          const termsJson =
            (newRow.terms as unknown) ?? (oldRow.terms as unknown) ?? null;

          const reseller: ResellerListItem = {
            id: String(newRow.id ?? oldRow.id ?? ""),
            name: String(newRow.name ?? oldRow.name ?? ""),
            contact: parseContact(contactJson as any),
            terms: parseTerms(termsJson as any),
            is_active: Boolean(newRow.is_active ?? oldRow.is_active ?? true),
            created_at: String(
              newRow.created_at ?? oldRow.created_at ?? new Date().toISOString(),
            ),
          };

          updateResellersCache(queryClient, (current) => {
            if (payload.eventType === "DELETE") {
              const nextItems = current.items.filter(
                (item) => item.id !== String(oldRow.id ?? ""),
              );
              if (nextItems.length === current.items.length) {
                return current;
              }
              return {
                items: nextItems,
                meta: adjustMetaTotal(current.meta, -1),
              };
            }

            const exists = current.items.some((item) => item.id === reseller.id);
            const items = exists
              ? current.items.map((item) =>
                  item.id === reseller.id ? reseller : item,
                )
              : [reseller, ...current.items];
            const meta =
              !exists && payload.eventType === "INSERT"
                ? adjustMetaTotal(current.meta, 1)
                : current.meta;
            return {
              items,
              meta,
            };
          });

          if (payload.eventType === "DELETE") {
            options.onDelete?.(String(oldRow.id ?? ""));
          } else {
            options.onUpsert?.(reseller);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [options, enabled, queryClient]);
}

type UseResellerOrdersOptions = {
  initialData?: DataTableQueryResult<ResellerOrder>;
};

export function useResellerOrders(
  resellerId: string,
  filters: ResellerOrderFilters,
  options: UseResellerOrdersOptions = {},
) {
  return useQuery({
    queryKey: [RESELLER_ORDERS_KEY, resellerId, filters],
    queryFn: () => listResellerOrders(resellerId, filters),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

type UseResellerCatalogOptions = {
  initialData?: DataTableQueryResult<ResellerCatalogEntry>;
};

export function useResellerCatalog(
  resellerId: string,
  filters: ResellerCatalogFilters,
  options: UseResellerCatalogOptions = {},
) {
  return useQuery({
    queryKey: [RESELLER_CATALOG_KEY, resellerId, filters],
    queryFn: () => listResellerCatalog(resellerId, filters),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}
