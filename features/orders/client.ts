import { AppError, ERR } from "@/lib/utils/errors";

import type { OrderFilters, OrderListItem } from "./types";
import type {
  CreateOrderInput,
  UpdateOrderPaymentInput,
  VoidOrderInput,
} from "./schemas";

type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

type ListOrdersResponse = {
  items: OrderListItem[];
};

export async function listOrders(filters: OrderFilters = {}) {
  const searchParams = new URLSearchParams();
  if (filters.channel && filters.channel !== "all") {
    searchParams.set("channel", filters.channel);
  }
  if (filters.status && filters.status !== "all") {
    searchParams.set("status", filters.status);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    searchParams.set("paymentStatus", filters.paymentStatus);
  }
  if (filters.search) {
    searchParams.set("search", filters.search);
  }
  if (filters.limit) {
    searchParams.set("limit", String(filters.limit));
  }

  const query = searchParams.toString();
  const url = `/api/pos/orders${query ? `?${query}` : ""}`;
  const response = await request<ListOrdersResponse>(url, { method: "GET" });
  return {
    items: response.data.items,
    meta: response.meta,
  };
}

export async function fetchOrder(orderId: string) {
  try {
    const { data } = await request<OrderListItem>(`/api/pos/orders/${orderId}`, {
      method: "GET",
    });
    return data;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === ERR.NOT_FOUND.statusCode) {
      return null;
    }
    throw error;
  }
}

export async function createOrder(input: CreateOrderInput) {
  const { data } = await request<OrderListItem>(`/api/pos/orders`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updateOrderPayment(
  orderId: string,
  input: UpdateOrderPaymentInput,
) {
  const { data } = await request<OrderListItem>(`/api/pos/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data;
}

export async function voidOrder(orderId: string, input: VoidOrderInput) {
  const { data } = await request<OrderListItem>(`/api/pos/orders/${orderId}/void`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function deleteOrder(orderId: string) {
  const { data } = await request<{ success: boolean }>(`/api/pos/orders/${orderId}`, {
    method: "DELETE",
  });
  return data.success;
}

async function request<T>(input: string, init: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch (error) {
    throw new AppError(
      ERR.SERVER_ERROR.statusCode,
      error instanceof Error
        ? error.message
        : "Unexpected response from server",
    );
  }

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Request failed",
    );
  }

  return {
    data: payload.data,
    meta: payload.meta,
  };
}
