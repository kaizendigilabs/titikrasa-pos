import type {
  CreatePurchaseOrderPayload,
  PurchaseOrderFilters,
  UpdatePurchaseOrderPayload,
} from "./schemas";
import type { PurchaseOrderListItem } from "./types";
import { parsePurchaseOrderItems } from "./types";
import { AppError, ERR } from "@/lib/utils/errors";

const ENDPOINT = "/api/procurements/purchase-orders" as const;

type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

type PurchaseOrderListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: Record<string, unknown> | null;
};

export type PurchaseOrderListResult = {
  items: PurchaseOrderListItem[];
  meta: PurchaseOrderListMeta | null;
};

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
      error instanceof Error ? error.message : "Unexpected response from server",
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

function transformPurchaseOrder(raw: any): PurchaseOrderListItem {
  return {
    id: raw.id,
    status: raw.status,
    items: parsePurchaseOrderItems(raw.items ?? []),
    totals: typeof raw.totals === "object" && raw.totals !== null ? raw.totals : {},
    issued_at: raw.issued_at ?? null,
    completed_at: raw.completed_at ?? null,
    created_at: raw.created_at ?? new Date().toISOString(),
  };
}

export async function listPurchaseOrders(
  filters: PurchaseOrderFilters,
): Promise<PurchaseOrderListResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));
  if (filters.status && filters.status !== "all") {
    searchParams.set("status", filters.status);
  }
  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  const response = await request<{ purchaseOrders: any[] }>(
    `${ENDPOINT}?${searchParams.toString()}`,
    { method: "GET" },
  );

  return {
    items: response.data.purchaseOrders.map(transformPurchaseOrder),
    meta: (response.meta as PurchaseOrderListMeta | null) ?? null,
  };
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload,
): Promise<PurchaseOrderListItem> {
  const { data } = await request<{ purchaseOrder: any }>(ENDPOINT, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return transformPurchaseOrder(data.purchaseOrder);
}

export async function updatePurchaseOrder(
  purchaseOrderId: string,
  payload: UpdatePurchaseOrderPayload,
): Promise<PurchaseOrderListItem> {
  const { data } = await request<{ purchaseOrder: any }>(`${ENDPOINT}/${purchaseOrderId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return transformPurchaseOrder(data.purchaseOrder);
}

export async function deletePurchaseOrder(purchaseOrderId: string): Promise<void> {
  await request<{ success: boolean }>(`${ENDPOINT}/${purchaseOrderId}`, {
    method: "DELETE",
  });
}
