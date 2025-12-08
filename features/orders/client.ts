import { apiClient } from "@/lib/api/client";
import { AppError, ERR } from "@/lib/utils/errors";

import type { OrderFilters, OrderListItem } from "./types";
import type {
  CreateOrderInput,
  UpdateOrderPaymentInput,
  VoidOrderInput,
} from "./schemas";

type ListOrdersResponse = {
  items: OrderListItem[];
};

/**
 * Fetches a paginated list of orders with optional filtering
 */
export async function listOrders(filters: OrderFilters = {}) {
  const params: Record<string, string> = {};
  
  if (filters.channel && filters.channel !== "all") {
    params.channel = filters.channel;
  }
  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    params.paymentStatus = filters.paymentStatus;
  }
  if (filters.search) {
    params.search = filters.search;
  }
  if (filters.limit) {
    params.limit = String(filters.limit);
  }

  const { data, meta } = await apiClient.get<ListOrdersResponse>(
    "/api/pos/orders",
    params
  );
  
  return {
    items: data.items,
    meta,
  };
}

/**
 * Fetches a single order by ID
 * Returns null if order not found
 */
export async function fetchOrder(orderId: string) {
  try {
    const { data } = await apiClient.get<OrderListItem>(
      `/api/pos/orders/${orderId}`
    );
    return data;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === ERR.NOT_FOUND.statusCode) {
      return null;
    }
    throw error;
  }
}

/**
 * Creates a new order
 */
export async function createOrder(input: CreateOrderInput) {
  const { data } = await apiClient.post<OrderListItem>(
    "/api/pos/orders",
    input
  );
  return data;
}

/**
 * Updates order payment status
 */
export async function updateOrderPayment(
  orderId: string,
  input: UpdateOrderPaymentInput,
) {
  const { data } = await apiClient.patch<OrderListItem>(
    `/api/pos/orders/${orderId}`,
    input
  );
  return data;
}

/**
 * Voids an existing order
 */
export async function voidOrder(orderId: string, input: VoidOrderInput) {
  const { data } = await apiClient.post<OrderListItem>(
    `/api/pos/orders/${orderId}/void`,
    input
  );
  return data;
}

/**
 * Deletes an order
 */
export async function deleteOrder(orderId: string) {
  const { data } = await apiClient.delete<{ success: boolean }>(
    `/api/pos/orders/${orderId}`
  );
  return data.success;
}
