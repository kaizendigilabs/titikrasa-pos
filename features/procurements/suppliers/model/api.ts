import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/client";

import { mapCatalogLinkRow, mapCatalogRow, mapSupplierRow, type SupplierRowWithAgg } from "../data/dto";
import type {
  IngredientSupplierLink,
  SupplierCatalogItem,
  SupplierListItem,
} from "../types";
import type {
  CreateCatalogItemPayload,
  CreateSupplierLinkPayload,
  CreateSupplierPayload,
  SupplierFilters,
  UpdateCatalogItemPayload,
  UpdateSupplierLinkPayload,
  UpdateSupplierPayload,
} from "./forms/schema";

const ENDPOINT = "/api/procurements/suppliers" as const;

export type SupplierListMeta = {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  } | null;
  filters?: {
    search: string | null;
    status: "all" | "active" | "inactive";
  } | null;
};

export type SupplierListResult = {
  items: SupplierListItem[];
  meta: SupplierListMeta | null;
};

export async function listSuppliers(filters: SupplierFilters): Promise<SupplierListResult> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.search) params.set("search", filters.search);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);

  const result = await apiRequest<{ suppliers: SupplierRowWithAgg[] }>(
    `${ENDPOINT}?${params.toString()}`,
    { method: "GET" },
  );

  const meta = (result.meta as SupplierListMeta | null) ?? null;

  return {
    items: (result.data.suppliers ?? []).map(mapSupplierRow),
    meta,
  };
}

export async function createSupplier(payload: CreateSupplierPayload): Promise<SupplierListItem> {
  const result = await apiRequest<{ supplier: SupplierRowWithAgg }>(ENDPOINT, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapSupplierRow(result.data.supplier);
}

export async function updateSupplier(
  supplierId: string,
  payload: UpdateSupplierPayload,
): Promise<SupplierListItem> {
  const result = await apiRequest<{ supplier: SupplierRowWithAgg }>(`${ENDPOINT}/${supplierId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapSupplierRow(result.data.supplier);
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  await apiRequest(`${ENDPOINT}/${supplierId}`, { method: "DELETE" });
}

export async function listCatalogItems(supplierId: string): Promise<SupplierCatalogItem[]> {
  const result = await apiRequest<{ items: SupplierCatalogItem[] }>(
    `${ENDPOINT}/${supplierId}/catalog`,
    { method: "GET" },
  );

  return (result.data.items ?? []).map(mapCatalogRow);
}

export async function createCatalogItem(
  payload: CreateCatalogItemPayload,
): Promise<SupplierCatalogItem> {
  const result = await apiRequest<{ item: SupplierCatalogItem }>(
    `${ENDPOINT}/${payload.supplierId}/catalog`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return mapCatalogRow(result.data.item);
}

export async function updateCatalogItem(
  supplierId: string,
  catalogItemId: string,
  payload: UpdateCatalogItemPayload,
): Promise<SupplierCatalogItem> {
  const result = await apiRequest<{ item: SupplierCatalogItem }>(
    `${ENDPOINT}/${supplierId}/catalog/${catalogItemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return mapCatalogRow(result.data.item);
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
  await apiRequest(`${ENDPOINT}/${supplierId}/catalog/${catalogItemId}`, {
    method: "DELETE",
  });
}

export async function createSupplierLink(
  supplierId: string,
  payload: CreateSupplierLinkPayload,
): Promise<{ linkId: string }> {
  const result = await apiRequest<{ linkId: string }>(
    `${ENDPOINT}/${supplierId}/links`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return result.data;
}

export async function updateSupplierLink(
  supplierId: string,
  linkId: string,
  payload: UpdateSupplierLinkPayload,
): Promise<{ success: boolean }> {
  const result = await apiRequest<{ success: boolean }>(
    `${ENDPOINT}/${supplierId}/links/${linkId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return result.data;
}

export async function deleteSupplierLink(
  supplierId: string,
  linkId: string,
): Promise<void> {
  await apiRequest(`${ENDPOINT}/${supplierId}/links/${linkId}`, {
    method: "DELETE",
  });
}

export type SupplierCatalogResponse = ApiResult<{ items: SupplierCatalogItem[] }>;

export type SupplierDetailCatalogItem = SupplierCatalogItem & {
  links?: IngredientSupplierLink[];
};

export function mapDetailCatalogItems(rows: any[]): SupplierDetailCatalogItem[] {
  return rows.map((row) => ({
    ...mapCatalogRow(row),
    links: Array.isArray(row.ingredient_supplier_links)
      ? row.ingredient_supplier_links.map(mapCatalogLinkRow)
      : [],
  }));
}
