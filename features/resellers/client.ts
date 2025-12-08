import { apiClient } from "@/lib/api/client";
import type { Json } from "@/lib/types/database";

import type { ResellerListItem, ResellerOrder } from "./types";
import type {
  CreateResellerPayload,
  ResellerFilters,
  ResellerOrderFilters,
  UpdateResellerPayload,
} from "./schemas";
import { parseContact, parseTerms } from "./types";

export type ResellerListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters?: Record<string, unknown> | null;
};

type ResellerListResponse = {
  items: ResellerListItem[];
};

type ResellerOrdersResponse = {
  items: ResellerOrder[];
};

type ResellerResponse = {
  reseller: ResellerListItem;
};

/**
 * Transforms raw API response to typed ResellerListItem
 */
function transformListItem(payload: Record<string, unknown>): ResellerListItem {
  return {
    id: payload.id as string,
    name: payload.name as string,
    contact: parseContact(payload.contact as Json),
    terms: parseTerms(payload.terms as Json),
    is_active: payload.is_active as boolean,
    created_at: payload.created_at as string,
  };
}

/**
 * Transforms raw API response to typed ResellerOrder
 */
function transformOrder(payload: Record<string, unknown>): ResellerOrder {
  return {
    id: payload.id as string,
    number: payload.number as string,
    status: payload.status as string,
    paymentStatus: (payload.paymentStatus ?? payload.payment_status) as string,
    paymentMethod: (payload.paymentMethod ?? payload.payment_method) as string,
    dueDate: (payload.dueDate ?? payload.due_date ?? null) as string | null,
    totalAmount: (payload.totalAmount ?? payload.total_amount ?? 0) as number,
    createdAt: (payload.createdAt ?? payload.created_at) as string,
    paidAt: (payload.paidAt ?? payload.paid_at ?? null) as string | null,
  };
}

/**
 * Fetches a paginated list of resellers
 */
export async function listResellers(
  filters: ResellerFilters,
): Promise<{ items: ResellerListItem[]; meta: ResellerListMeta | null }> {
  const params: Record<string, string> = {
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  };
  
  if (filters.search) {
    params.search = filters.search;
  }
  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }

  const { data, meta } = await apiClient.get<ResellerListResponse>(
    "/api/resellers",
    params
  );

  return {
    items: data.items.map((item) => transformListItem(item as unknown as Record<string, unknown>)),
    meta: (meta as ResellerListMeta | null) ?? null,
  };
}

/**
 * Creates a new reseller
 */
export async function createReseller(
  input: CreateResellerPayload,
): Promise<ResellerListItem> {
  const { data } = await apiClient.post<ResellerResponse>("/api/resellers", input);
  return transformListItem(data.reseller as unknown as Record<string, unknown>);
}

/**
 * Updates an existing reseller
 */
export async function updateReseller(
  resellerId: string,
  input: UpdateResellerPayload,
): Promise<ResellerListItem> {
  const { data } = await apiClient.patch<ResellerResponse>(
    `/api/resellers/${resellerId}`,
    input
  );
  return transformListItem(data.reseller as unknown as Record<string, unknown>);
}

/**
 * Toggles reseller active status
 */
export async function toggleResellerStatus(
  resellerId: string,
  isActive: boolean
): Promise<ResellerListItem> {
  const { data } = await apiClient.patch<ResellerResponse>(
    `/api/resellers/${resellerId}`,
    { isActive }
  );
  return transformListItem(data.reseller as unknown as Record<string, unknown>);
}

/**
 * Deletes a reseller
 */
export async function deleteReseller(resellerId: string): Promise<void> {
  await apiClient.delete<{ success: boolean }>(`/api/resellers/${resellerId}`);
}

/**
 * Fetches orders for a specific reseller
 */
export async function listResellerOrders(
  resellerId: string,
  filters: ResellerOrderFilters,
) {
  const params: Record<string, string> = {
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  };
  
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    params.paymentStatus = filters.paymentStatus;
  }
  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }

  const { data, meta } = await apiClient.get<ResellerOrdersResponse>(
    `/api/resellers/${resellerId}/orders`,
    params
  );

  return {
    items: data.items.map((item) => transformOrder(item as unknown as Record<string, unknown>)),
    meta: (meta as ResellerListMeta | null) ?? null,
  };
}
