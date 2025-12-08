import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

import { CACHE_POLICIES } from "@/lib/api/cache-policies";
import { createBrowserClient } from "@/lib/supabase/client";

import {
  createOrder,
  deleteOrder,
  listOrders,
  updateOrderPayment,
  voidOrder,
} from "./client";
import type { OrderFilters, OrderListItem, OrderItem } from "./types";
import type {
  CreateOrderInput,
  UpdateOrderPaymentInput,
  VoidOrderInput,
} from "./schemas";
import { computeOrderTotals } from "./utils";
import { ordersQueryKey } from "./keys";

// Re-export query key for external usage
export { ordersQueryKey } from "./keys";

type UseOrdersOptions = {
  initialData?: Awaited<ReturnType<typeof listOrders>>;
};

type UseCreateOrderOptions = {
  getResellerName?: (resellerId: string) => string | undefined;
};

/**
 * Hook for fetching orders list with real-time updates
 */
export function useOrders(filters: OrderFilters, options: UseOrdersOptions = {}) {
  return useQuery({
    queryKey: ordersQueryKey(filters),
    queryFn: () => listOrders(filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.REALTIME,
    retry: 1,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}


/**
 * Hook for creating a new order with optimistic updates
 */
export function useCreateOrderMutation(
  filters: OrderFilters,
  options: UseCreateOrderOptions = {},
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ordersQueryKey(filters) });
      
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof listOrders>>>(
        ordersQueryKey(filters),
      );

      const optimisticOrder = buildOptimisticOrder(input, options.getResellerName);

      queryClient.setQueryData<Awaited<ReturnType<typeof listOrders>>>(
        ordersQueryKey(filters),
        (prev) => {
          if (!prev) {
            return { items: [optimisticOrder], meta: null };
          }
          return {
            items: [optimisticOrder, ...prev.items],
            meta: prev.meta,
          };
        },
      );

      return { previous, optimisticId: optimisticOrder.id };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ordersQueryKey(filters), context.previous);
      }
    },
    onSuccess: (order, _input, context) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof listOrders>>>(
        ordersQueryKey(filters),
        (prev) => {
          if (!prev) {
            return { items: [order], meta: null };
          }
          const filteredItems = prev.items.filter(
            (item) => item.id !== context?.optimisticId,
          );
          return {
            items: [order, ...filteredItems],
            meta: prev.meta,
          };
        },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey(filters) });
    },
  });
}

/**
 * Builds an optimistic order for immediate UI feedback
 */
function buildOptimisticOrder(
  input: CreateOrderInput,
  getResellerName?: (resellerId: string) => string | undefined,
): OrderListItem {
  const now = new Date().toISOString();
  const tempId = `optimistic-${Math.random().toString(36).slice(2)}`;
  const totals = computeOrderTotals(input.items, input.discount, input.taxRate);
  
  const items: OrderItem[] = input.items.map((item, index) => ({
    id: item.id ?? `optimistic-item-${index}-${tempId}`,
    menuId: item.menuId,
    menuName: item.menuName,
    menuSku: item.menuSku ?? null,
    thumbnailUrl: item.thumbnailUrl ?? null,
    variant: item.variant,
    size: item.size,
    temperature: item.temperature,
    qty: item.qty,
    price: item.unitPrice,
    discount: item.discount ?? 0,
    tax: item.tax ?? 0,
  }));

  const status = input.paymentStatus === "paid" ? "paid" : "open";
  const reseller =
    input.channel === "reseller" && input.resellerId
      ? {
          id: input.resellerId,
          name: getResellerName?.(input.resellerId) ?? "Reseller",
        }
      : null;

  const dueDate =
    input.paymentStatus === "unpaid" ? input.dueDate ?? null : null;

  return {
    id: tempId,
    number: "POS-TEMP",
    channel: input.channel,
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentStatus,
    status,
    dueDate,
    totals,
    createdAt: now,
    paidAt: input.paymentStatus === "paid" ? now : null,
    customerNote: input.note ?? null,
    reseller,
    items,
  };
}

/**
 * Hook for updating order payment
 */
export function useUpdateOrderPaymentMutation(filters: OrderFilters) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: UpdateOrderPaymentInput }) =>
      updateOrderPayment(orderId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey(filters) });
    },
  });
}

/**
 * Hook for voiding an order
 */
export function useVoidOrderMutation(filters: OrderFilters) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: VoidOrderInput }) =>
      voidOrder(orderId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey(filters) });
    },
  });
}

/**
 * Hook for deleting an order
 */
export function useDeleteOrderMutation(filters: OrderFilters) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey(filters) });
    },
  });
}

/**
 * Hook for real-time order updates via Supabase
 */
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
        void queryClient.invalidateQueries({ queryKey: ordersQueryKey(filters) });
      },
    );

    void channel.subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [filters, options.enabled, queryClient]);
}

/**
 * Utility function to find an order in a list
 */
export function findOrder(
  list: OrderListItem[],
  orderId: string,
): [index: number, order: OrderListItem | null] {
  const index = list.findIndex((item) => item.id === orderId);
  return [index, index >= 0 ? list[index] : null];
}
