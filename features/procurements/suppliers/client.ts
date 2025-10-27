import type {
  CreateSupplierPayload,
  SupplierFilters,
  UpdateSupplierPayload,
  CreateCatalogItemPayload,
  UpdateCatalogItemPayload,
  CreateSupplierLinkPayload,
  UpdateSupplierLinkPayload,
} from "./schemas";
import type {
  SupplierListItem,
  SupplierCatalogItem,
} from "./types";
import { parseSupplierContact } from "./types";
import { AppError, ERR } from "@/lib/utils/errors";

const SUPPLIERS_ENDPOINT = "/api/procurements/suppliers" as const;

type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

type SupplierListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: Record<string, unknown> | null;
};

export type SupplierListResult = {
  items: SupplierListItem[];
  meta: SupplierListMeta | null;
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

function transformSupplier(raw: any): SupplierListItem {
  const catalogCount = typeof raw.catalog_count === "number" ? raw.catalog_count : 0;
  return {
    id: raw.id,
    name: raw.name,
    is_active: Boolean(raw.is_active),
    contact: parseSupplierContact(raw.contact ?? null),
    catalogCount,
    created_at: raw.created_at,
  };
}

function transformCatalogItem(raw: any): SupplierCatalogItem {
  return {
    id: raw.id,
    supplier_id: raw.supplier_id,
    name: raw.name,
    base_uom: raw.base_uom,
    purchase_price: raw.purchase_price,
    is_active: raw.is_active,
    created_at: raw.created_at,
  };
}

export async function listSuppliers(filters: SupplierFilters): Promise<SupplierListResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));
  if (filters.search) searchParams.set("search", filters.search);
  if (filters.status && filters.status !== "all") searchParams.set("status", filters.status);

  const response = await request<{ suppliers: any[] }>(
    `${SUPPLIERS_ENDPOINT}?${searchParams.toString()}`,
    { method: "GET" },
  );

  return {
    items: response.data.suppliers.map(transformSupplier),
    meta: (response.meta as SupplierListMeta | null) ?? null,
  };
}

export async function createSupplier(payload: CreateSupplierPayload): Promise<SupplierListItem> {
  const { data } = await request<{ supplier: any }>(SUPPLIERS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return transformSupplier(data.supplier);
}

export async function updateSupplier(
  supplierId: string,
  payload: UpdateSupplierPayload,
): Promise<SupplierListItem> {
  const { data } = await request<{ supplier: any }>(`${SUPPLIERS_ENDPOINT}/${supplierId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return transformSupplier(data.supplier);
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  await request<{ success: boolean }>(`${SUPPLIERS_ENDPOINT}/${supplierId}`, {
    method: "DELETE",
  });
}

export async function listCatalogItems(supplierId: string): Promise<SupplierCatalogItem[]> {
  const { data } = await request<{ items: any[] }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/catalog`,
    { method: "GET" },
  );
  return data.items.map(transformCatalogItem);
}

export async function createCatalogItem(
  payload: CreateCatalogItemPayload,
): Promise<SupplierCatalogItem> {
  const { data } = await request<{ item: any }>(
    `${SUPPLIERS_ENDPOINT}/${payload.supplierId}/catalog`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return transformCatalogItem(data.item);
}

export async function updateCatalogItem(
  supplierId: string,
  catalogItemId: string,
  payload: UpdateCatalogItemPayload,
): Promise<SupplierCatalogItem> {
  const { data } = await request<{ item: any }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/catalog/${catalogItemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return transformCatalogItem(data.item);
}

export async function toggleCatalogItem(
  supplierId: string,
  catalogItemId: string,
  isActive: boolean,
): Promise<SupplierCatalogItem> {
  return updateCatalogItem(supplierId, catalogItemId, { isActive });
}

export async function deleteCatalogItem(
  supplierId: string,
  catalogItemId: string,
): Promise<void> {
  await request<{ success: boolean }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/catalog/${catalogItemId}`,
    { method: "DELETE" },
  );
}

export async function createSupplierLink(
  supplierId: string,
  payload: CreateSupplierLinkPayload,
): Promise<{ linkId: string }> {
  const { data } = await request<{ linkId: string }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/links`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return data;
}

export async function updateSupplierLink(
  supplierId: string,
  linkId: string,
  payload: UpdateSupplierLinkPayload,
): Promise<{ success: boolean }> {
  const { data } = await request<{ success: boolean }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/links/${linkId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return data;
}

export async function deleteSupplierLink(
  supplierId: string,
  linkId: string,
): Promise<void> {
  await request<{ success: boolean }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/links/${linkId}`,
    { method: "DELETE" },
  );
}
