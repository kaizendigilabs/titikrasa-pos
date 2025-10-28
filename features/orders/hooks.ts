import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

import {
  createOrder,
  deleteOrder,
  listOrders,
  updateOrderPayment,
  voidOrder,
} from "./client";
import type { OrderFilters, OrderListItem } from "./types";
import type {
  CreateOrderInput,
  UpdateOrderPaymentInput,
  VoidOrderInput,
} from "./schemas";
import { createBrowserClient } from "@/lib/supabase/client";

const ORDERS_QUERY_KEY = "pos-orders";

type UseOrdersOptions = {
  initialData?: Awaited<ReturnType<typeof listOrders>>;
};

export function useOrders(filters: OrderFilters, options: UseOrdersOptions = {}) {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, filters],
    queryFn: () => listOrders(filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

export function useCreateOrderMutation(filters: OrderFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (order) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof listOrders>>>(
        [ORDERS_QUERY_KEY, filters],
        (prev) => {
          if (!prev) return prev;
          return {
            items: [order, ...prev.items],
            meta: prev.meta,
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
  });
}

export function useUpdateOrderPaymentMutation(filters: OrderFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: UpdateOrderPaymentInput }) =>
      updateOrderPayment(orderId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, filters] });
    },
  });
}

export function useVoidOrderMutation(filters: OrderFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: VoidOrderInput }) =>
      voidOrder(orderId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, filters] });
    },
  });
}

export function useDeleteOrderMutation(filters: OrderFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, filters] });
    },
  });
}

export function useOrdersRealtime(filters: OrderFilters, options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (options.enabled === false) return;

    const supabase = createBrowserClient();
    const channel = supabase.channel("pos-orders-realtime");

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => {
        void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, filters] });
      },
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "kds_tickets" },
      () => {
        void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, filters] });
      },
    );

    void channel.subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [filters, options.enabled, queryClient]);
}

export function findOrder(
  list: OrderListItem[],
  orderId: string,
): [index: number, order: OrderListItem | null] {
  const index = list.findIndex((item) => item.id === orderId);
  return [index, index >= 0 ? list[index] : null];
}
