import { apiRequest } from "@/lib/api/client";

import { mapPurchaseOrderRow } from "../data/dto";
import type { PurchaseOrderListItem } from "../types";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderFilters,
  UpdatePurchaseOrderInput,
} from "./forms/schema";

const ENDPOINT = "/api/procurements/purchase-orders" as const;

type PurchaseOrderListResponse = {
  purchaseOrders: Array<Record<string, unknown>>;
};

type PurchaseOrderResponse = {
  purchaseOrder: Record<string, unknown>;
};

type PurchaseOrderListMeta = {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters?: Record<string, unknown> | null;
};

export async function fetchPurchaseOrders(
  filters: PurchaseOrderFilters,
): Promise<{ items: PurchaseOrderListItem[]; meta: PurchaseOrderListMeta | null }> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));
  if (filters.status && filters.status !== "all") {
    searchParams.set("status", filters.status);
  }
  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  const { data, meta } = await apiRequest<PurchaseOrderListResponse>(
    `${ENDPOINT}?${searchParams.toString()}`,
    { method: "GET" },
  );

  const items = data.purchaseOrders.map((row) =>
    mapPurchaseOrderRow(row as any),
  );
  return { items, meta: (meta as PurchaseOrderListMeta | null) ?? null };
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
): Promise<PurchaseOrderListItem> {
  const { data } = await apiRequest<PurchaseOrderResponse>(ENDPOINT, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return mapPurchaseOrderRow(data.purchaseOrder as any);
}

export async function updatePurchaseOrder(
  purchaseOrderId: string,
  input: UpdatePurchaseOrderInput,
): Promise<PurchaseOrderListItem> {
  const { data } = await apiRequest<PurchaseOrderResponse>(
    `${ENDPOINT}/${purchaseOrderId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return mapPurchaseOrderRow(data.purchaseOrder as any);
}

export async function deletePurchaseOrder(purchaseOrderId: string): Promise<void> {
  await apiRequest(`${ENDPOINT}/${purchaseOrderId}` as const, {
    method: "DELETE",
  });
}
