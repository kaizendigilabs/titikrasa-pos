import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import {
  createPurchaseOrder,
  deletePurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
} from "./client";
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrderFilters,
  UpdatePurchaseOrderPayload,
} from "./schemas";
import type { PurchaseOrderListItem } from "./types";
import { createBrowserClient } from "@/lib/supabase/client";

const PURCHASE_ORDERS_KEY = "purchaseOrders";

type PurchaseOrderQuerySnapshot = {
  items: PurchaseOrderListItem[];
  meta: unknown;
};

type UsePurchaseOrdersOptions = {
  initialData?: Awaited<ReturnType<typeof listPurchaseOrders>>;
};

export function usePurchaseOrders(
  filters: PurchaseOrderFilters,
  options: UsePurchaseOrdersOptions = {},
) {
  return useQuery({
    queryKey: [PURCHASE_ORDERS_KEY, filters],
    queryFn: () => listPurchaseOrders(filters),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

function updatePurchaseOrdersCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (snapshot: PurchaseOrderQuerySnapshot) => PurchaseOrderQuerySnapshot,
) {
  queryClient.setQueriesData<PurchaseOrderQuerySnapshot | undefined>(
    { queryKey: [PURCHASE_ORDERS_KEY] },
    (current) => {
      if (!current) return current;
      return updater(current);
    },
  );
}

export function useCreatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => createPurchaseOrder(payload),
    onSuccess: (purchaseOrder) => {
      updatePurchaseOrdersCache(queryClient, (snapshot) => ({
        items: [purchaseOrder, ...snapshot.items],
        meta: snapshot.meta,
      }));
    },
  });
}

export function useUpdatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ purchaseOrderId, payload }: { purchaseOrderId: string; payload: UpdatePurchaseOrderPayload }) =>
      updatePurchaseOrder(purchaseOrderId, payload),
    onSuccess: (purchaseOrder) => {
      updatePurchaseOrdersCache(queryClient, (snapshot) => ({
        items: snapshot.items.map((item) => (item.id === purchaseOrder.id ? purchaseOrder : item)),
        meta: snapshot.meta,
      }));
    },
  });
}

export function useDeletePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (purchaseOrderId: string) => deletePurchaseOrder(purchaseOrderId),
    onSuccess: (_data, purchaseOrderId) => {
      updatePurchaseOrdersCache(queryClient, (snapshot) => ({
        items: snapshot.items.filter((item) => item.id !== purchaseOrderId),
        meta: snapshot.meta,
      }));
    },
  });
}

export function usePurchaseOrdersRealtime(enabled = true) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("purchase-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_KEY] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
