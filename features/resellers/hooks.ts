import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import { CACHE_POLICIES } from "@/lib/api/cache-policies";
import { createBrowserClient } from "@/lib/supabase/client";
import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";

import {
  createReseller,
  deleteReseller,
  listResellerOrders,
  listResellers,
  toggleResellerStatus,
  updateReseller,
  type ResellerListMeta,
} from "./client";
import type {
  ResellerFilters,
  ResellerOrderFilters,
  UpdateResellerPayload,
} from "./schemas";
import type { Json } from "@/lib/types/database";
import type { ResellerListItem, ResellerOrder } from "./types";
import { parseContact, parseTerms } from "./types";

const RESELLERS_KEY = "resellers";
const RESELLER_ORDERS_KEY = "reseller-orders";

type UseResellersOptions = {
  initialData?: Awaited<ReturnType<typeof listResellers>>;
};

type ResellersQuerySnapshot = {
  items: ResellerListItem[];
  meta: ResellerListMeta | null;
};

/**
 * Adjusts pagination total by delta
 */
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

/**
 * Updates all resellers cache queries
 */
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

/**
 * Hook for fetching resellers list
 */
export function useResellers(filters: ResellerFilters, options: UseResellersOptions = {}) {
  return useQuery({
    queryKey: [RESELLERS_KEY, filters],
    queryFn: () => listResellers(filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.STATIC,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

/**
 * Hook for creating a reseller
 */
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

/**
 * Hook for updating a reseller
 */
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

/**
 * Hook for toggling reseller status
 */
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

/**
 * Hook for deleting a reseller
 */
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

/**
 * Hook for real-time reseller updates via Supabase
 */
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
            contact: parseContact(contactJson as Json),
            terms: parseTerms(termsJson as Json),
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

/**
 * Hook for fetching reseller orders
 */
export function useResellerOrders(
  resellerId: string,
  filters: ResellerOrderFilters,
  options: UseResellerOrdersOptions = {},
) {
  return useQuery({
    queryKey: [RESELLER_ORDERS_KEY, resellerId, filters],
    queryFn: () => listResellerOrders(resellerId, filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.FREQUENT,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}
