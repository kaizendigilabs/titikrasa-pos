import type {
  ResellerCatalogEntry,
  ResellerListItem,
  ResellerOrder,
} from "./types";
import type {
  CreateResellerPayload,
  ResellerCatalogFilters,
  ResellerFilters,
  ResellerOrderFilters,
  UpdateResellerPayload,
} from "./schemas";
import { parseContact, parseTerms } from "./types";
import { AppError, ERR } from "@/lib/utils/errors";

type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

export type ResellerListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters?: Record<string, unknown> | null;
};

export type ResellerListResponse = {
  items: ResellerListItem[];
};

export type ResellerOrdersResponse = {
  items: ResellerOrder[];
};

export type ResellerCatalogResponse = {
  items: ResellerCatalogEntry[];
};

function transformListItem(payload: any): ResellerListItem {
  return {
    id: payload.id,
    name: payload.name,
    contact: parseContact(payload.contact),
    terms: parseTerms(payload.terms),
    is_active: payload.is_active,
    created_at: payload.created_at,
  };
}

function transformOrder(payload: any): ResellerOrder {
  return {
    id: payload.id,
    number: payload.number,
    status: payload.status,
    paymentStatus: payload.paymentStatus ?? payload.payment_status,
    paymentMethod: payload.paymentMethod ?? payload.payment_method,
    dueDate: payload.dueDate ?? payload.due_date ?? null,
    totalAmount: payload.totalAmount ?? payload.total_amount ?? 0,
    createdAt: payload.createdAt ?? payload.created_at,
    paidAt: payload.paidAt ?? payload.paid_at ?? null,
  };
}

function transformCatalogEntry(payload: any): ResellerCatalogEntry {
  return {
    menuId: payload.menuId ?? payload.menu_id,
    menuName: payload.menuName ?? payload.menu_name ?? "Menu",
    thumbnailUrl: payload.thumbnailUrl ?? payload.thumbnail_url ?? null,
    totalQty: payload.totalQty ?? payload.total_qty ?? 0,
    lastOrderAt: payload.lastOrderAt ?? payload.last_order_at ?? null,
    lastPrice: payload.lastPrice ?? payload.last_price ?? null,
  };
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

export async function listResellers(
  filters: ResellerFilters,
): Promise<{ items: ResellerListItem[]; meta: ResellerListMeta | null }> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));
  if (filters.search) {
    searchParams.set("search", filters.search);
  }
  if (filters.status && filters.status !== "all") {
    searchParams.set("status", filters.status);
  }

  const response = await request<ResellerListResponse>(
    `/api/resellers?${searchParams.toString()}`,
    { method: "GET" },
  );

  return {
    items: response.data.items.map(transformListItem),
    meta: (response.meta as ResellerListMeta | null) ?? null,
  };
}

export async function createReseller(
  input: CreateResellerPayload,
): Promise<ResellerListItem> {
  const { data } = await request<{ reseller: ResellerListItem }>(
    "/api/resellers",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return transformListItem(data.reseller);
}

export async function updateReseller(
  resellerId: string,
  input: UpdateResellerPayload,
): Promise<ResellerListItem> {
  const { data } = await request<{ reseller: ResellerListItem }>(
    `/api/resellers/${resellerId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return transformListItem(data.reseller);
}

export async function toggleResellerStatus(resellerId: string, isActive: boolean) {
  const { data } = await request<{ reseller: ResellerListItem }>(
    `/api/resellers/${resellerId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
  );
  return transformListItem(data.reseller);
}

export async function deleteReseller(resellerId: string): Promise<void> {
  await request<{ success: boolean }>(`/api/resellers/${resellerId}`, {
    method: "DELETE",
  });
}

export async function listResellerOrders(
  resellerId: string,
  filters: ResellerOrderFilters,
) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    searchParams.set("paymentStatus", filters.paymentStatus);
  }
  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  const response = await request<ResellerOrdersResponse>(
    `/api/resellers/${resellerId}/orders?${searchParams.toString()}`,
    { method: "GET" },
  );

  return {
    items: response.data.items.map(transformOrder),
    meta: (response.meta as ResellerListMeta | null) ?? null,
  };
}

export async function listResellerCatalog(
  resellerId: string,
  filters: ResellerCatalogFilters,
) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));
  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  const response = await request<ResellerCatalogResponse>(
    `/api/resellers/${resellerId}/catalog?${searchParams.toString()}`,
    { method: "GET" },
  );

  return {
    items: response.data.items.map(transformCatalogEntry),
    meta: (response.meta as ResellerListMeta | null) ?? null,
  };
}
