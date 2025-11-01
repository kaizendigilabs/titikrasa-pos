import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import { createBrowserClient } from "@/lib/supabase/client";

import { createPurchaseOrder, deletePurchaseOrder, fetchPurchaseOrders, updatePurchaseOrder } from "./api";
import { normalizeFilters } from "./forms/state";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderFilters,
  UpdatePurchaseOrderInput,
} from "./forms/schema";

const PURCHASE_ORDERS_QUERY_KEY = "purchaseOrders";

type PurchaseOrderListResult = Awaited<ReturnType<typeof fetchPurchaseOrders>>;

type UsePurchaseOrdersOptions = {
  initialData?: PurchaseOrderListResult;
};

export function usePurchaseOrders(
  filters: PurchaseOrderFilters,
  options: UsePurchaseOrdersOptions = {},
) {
  const normalized = normalizeFilters(filters);
  return useQuery({
    queryKey: [PURCHASE_ORDERS_QUERY_KEY, normalized],
    queryFn: () => fetchPurchaseOrders(normalized),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

function updateCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (snapshot: PurchaseOrderListResult) => PurchaseOrderListResult,
) {
  queryClient.setQueriesData<PurchaseOrderListResult | undefined>(
    { queryKey: [PURCHASE_ORDERS_QUERY_KEY] },
    (current) => {
      if (!current) return current;
      return updater(current);
    },
  );
}

export function useCreatePurchaseOrderMutation(filters: PurchaseOrderFilters) {
  const queryClient = useQueryClient();
  const normalized = normalizeFilters(filters);
  return useMutation({
    mutationFn: (input: CreatePurchaseOrderInput) => createPurchaseOrder(input),
    onSuccess: (purchaseOrder) => {
      updateCache(queryClient, (snapshot) => ({
        items: [purchaseOrder, ...snapshot.items],
        meta: snapshot.meta,
      }));
      void queryClient.invalidateQueries({
        queryKey: [PURCHASE_ORDERS_QUERY_KEY, normalized],
      });
    },
  });
}

export function useUpdatePurchaseOrderMutation(filters: PurchaseOrderFilters) {
  const queryClient = useQueryClient();
  const normalized = normalizeFilters(filters);
  return useMutation({
    mutationFn: ({
      purchaseOrderId,
      payload,
    }: { purchaseOrderId: string; payload: UpdatePurchaseOrderInput }) =>
      updatePurchaseOrder(purchaseOrderId, payload),
    onSuccess: (purchaseOrder) => {
      updateCache(queryClient, (snapshot) => ({
        items: snapshot.items.map((item) =>
          item.id === purchaseOrder.id ? purchaseOrder : item,
        ),
        meta: snapshot.meta,
      }));
      void queryClient.invalidateQueries({
        queryKey: [PURCHASE_ORDERS_QUERY_KEY, normalized],
      });
    },
  });
}

export function useDeletePurchaseOrderMutation(filters: PurchaseOrderFilters) {
  const queryClient = useQueryClient();
  const normalized = normalizeFilters(filters);
  return useMutation({
    mutationFn: (purchaseOrderId: string) => deletePurchaseOrder(purchaseOrderId),
    onSuccess: (_result, purchaseOrderId) => {
      updateCache(queryClient, (snapshot) => ({
        items: snapshot.items.filter((item) => item.id !== purchaseOrderId),
        meta: snapshot.meta,
      }));
      void queryClient.invalidateQueries({
        queryKey: [PURCHASE_ORDERS_QUERY_KEY, normalized],
      });
    },
  });
}

export function usePurchaseOrdersRealtime(filters: PurchaseOrderFilters, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const queryClient = useQueryClient();
  const normalized = normalizeFilters(filters);

  React.useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("purchase-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_orders" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: [PURCHASE_ORDERS_QUERY_KEY, normalized],
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, normalized, queryClient]);
}
