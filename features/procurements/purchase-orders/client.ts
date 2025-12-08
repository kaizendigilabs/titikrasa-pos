import { apiClient } from "@/lib/api/client";

import type {
  CreatePurchaseOrderPayload,
  PurchaseOrderFilters,
  UpdatePurchaseOrderPayload,
} from "./schemas";
import type { Json } from "@/lib/types/database";
import type { PurchaseOrderListItem, PurchaseOrderStatus } from "./types";
import { parsePurchaseOrderItems, parseGrandTotal } from "./types";

const ENDPOINT = "/api/procurements/purchase-orders" as const;

type PurchaseOrderListFiltersMeta = {
  status: string;
  search: string | null;
  supplierId: string | null;
  issuedFrom: string | null;
  issuedTo: string | null;
};

export type PurchaseOrderListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: PurchaseOrderListFiltersMeta | null;
};

export type PurchaseOrderListResult = {
  items: PurchaseOrderListItem[];
  meta: PurchaseOrderListMeta | null;
};

type PurchaseOrdersResponse = {
  purchaseOrders: Array<Record<string, unknown>>;
};

type PurchaseOrderResponse = {
  purchaseOrder: Record<string, unknown>;
};

/**
 * Extracts supplier name from raw API response
 */
function extractSupplierName(raw: Record<string, unknown>): string {
  const supplierData = raw.suppliers;
  if (Array.isArray(supplierData)) {
    return (supplierData[0]?.name ?? "Unknown supplier") as string;
  }
  if (supplierData && typeof supplierData === "object") {
    return ((supplierData as Record<string, unknown>).name ?? "Unknown supplier") as string;
  }
  return (raw.supplier_name ?? "Unknown supplier") as string;
}

/**
 * Transforms raw API response to typed PurchaseOrderListItem
 */
function transformPurchaseOrder(raw: Record<string, unknown>): PurchaseOrderListItem {
  return {
    id: raw.id as string,
    status: raw.status as PurchaseOrderStatus,
    items: parsePurchaseOrderItems((raw.items ?? null) as Json),
    totals: typeof raw.totals === "object" && raw.totals !== null ? raw.totals as Record<string, unknown> : {},
    supplier_id: (raw.supplier_id ?? "") as string,
    supplier_name: extractSupplierName(raw),
    grand_total: parseGrandTotal((raw.totals ?? null) as Record<string, unknown> | null),
    issued_at: (raw.issued_at ?? null) as string | null,
    completed_at: (raw.completed_at ?? null) as string | null,
    created_at: (raw.created_at ?? new Date().toISOString()) as string,
  };
}

/**
 * Fetches a paginated list of purchase orders
 */
export async function listPurchaseOrders(
  filters: PurchaseOrderFilters,
): Promise<PurchaseOrderListResult> {
  const params: Record<string, string> = {
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  };
  
  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }
  if (filters.search) {
    params.search = filters.search;
  }
  if (filters.supplierId) {
    params.supplierId = filters.supplierId;
  }
  if (filters.issuedFrom) {
    params.issuedFrom = filters.issuedFrom;
  }
  if (filters.issuedTo) {
    params.issuedTo = filters.issuedTo;
  }

  const { data, meta } = await apiClient.get<PurchaseOrdersResponse>(
    ENDPOINT,
    params
  );

  return {
    items: data.purchaseOrders.map(transformPurchaseOrder),
    meta: (meta as PurchaseOrderListMeta | null) ?? null,
  };
}

/**
 * Creates a new purchase order
 */
export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload,
): Promise<PurchaseOrderListItem> {
  const { data } = await apiClient.post<PurchaseOrderResponse>(ENDPOINT, payload);
  return transformPurchaseOrder(data.purchaseOrder);
}

/**
 * Updates an existing purchase order
 */
export async function updatePurchaseOrder(
  purchaseOrderId: string,
  payload: UpdatePurchaseOrderPayload,
): Promise<PurchaseOrderListItem> {
  const { data } = await apiClient.patch<PurchaseOrderResponse>(
    `${ENDPOINT}/${purchaseOrderId}`,
    payload
  );
  return transformPurchaseOrder(data.purchaseOrder);
}

/**
 * Deletes a purchase order
 */
export async function deletePurchaseOrder(purchaseOrderId: string): Promise<void> {
  await apiClient.delete<{ success: boolean }>(`${ENDPOINT}/${purchaseOrderId}`);
}
