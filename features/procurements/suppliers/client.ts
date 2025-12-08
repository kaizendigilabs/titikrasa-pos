import { apiClient } from "@/lib/api/client";
import type { Json } from "@/lib/types/database";

import type {
  CreateSupplierPayload,
  SupplierFilters,
  UpdateSupplierPayload,
  CreateCatalogItemPayload,
  UpdateCatalogItemPayload,
  CreateSupplierLinkPayload,
  UpdateSupplierLinkPayload,
  SupplierOrderFilters,
  SupplierCatalogFilters,
} from "./schemas";
import type {
  SupplierListItem,
  SupplierCatalogItem,
  SupplierOrder,
  SupplierCatalogWithLinks,
} from "./types";
import { parseSupplierContact } from "./types";

const SUPPLIERS_ENDPOINT = "/api/procurements/suppliers" as const;

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

type SupplierOrdersResponse = {
  items: SupplierOrder[];
};

type SuppliersResponse = {
  suppliers: Array<Record<string, unknown>>;
};

type SupplierResponse = {
  supplier: Record<string, unknown>;
};

type CatalogItemsResponse = {
  items: Array<Record<string, unknown>>;
};

type CatalogItemResponse = {
  item: Record<string, unknown>;
};

/**
 * Transforms raw API response to typed SupplierListItem
 */
function transformSupplier(raw: Record<string, unknown>): SupplierListItem {
  const catalogCount = typeof raw.catalog_count === "number" ? raw.catalog_count : 0;
  return {
    id: raw.id as string,
    name: raw.name as string,
    is_active: Boolean(raw.is_active),
    contact: parseSupplierContact((raw.contact ?? null) as Json | null),
    catalogCount,
    created_at: raw.created_at as string,
  };
}

/**
 * Transforms raw API response to typed SupplierCatalogItem
 */
function transformCatalogItem(raw: Record<string, unknown>): SupplierCatalogItem {
  return {
    id: raw.id as string,
    supplier_id: raw.supplier_id as string,
    name: raw.name as string,
    base_uom: raw.base_uom as string,
    purchase_price: raw.purchase_price as number,
    unit_label: raw.unit_label as string | null,
    conversion_rate: Number(raw.conversion_rate ?? 1),
    is_active: raw.is_active as boolean,
    created_at: raw.created_at as string,
  };
}

/**
 * Fetches a paginated list of suppliers
 */
export async function listSuppliers(filters: SupplierFilters): Promise<SupplierListResult> {
  const params: Record<string, string> = {
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  };
  
  if (filters.search) params.search = filters.search;
  if (filters.status && filters.status !== "all") params.status = filters.status;

  const { data, meta } = await apiClient.get<SuppliersResponse>(
    SUPPLIERS_ENDPOINT,
    params
  );

  return {
    items: data.suppliers.map(transformSupplier),
    meta: (meta as SupplierListMeta | null) ?? null,
  };
}

/**
 * Creates a new supplier
 */
export async function createSupplier(payload: CreateSupplierPayload): Promise<SupplierListItem> {
  const { data } = await apiClient.post<SupplierResponse>(SUPPLIERS_ENDPOINT, payload);
  return transformSupplier(data.supplier);
}

/**
 * Updates an existing supplier
 */
export async function updateSupplier(
  supplierId: string,
  payload: UpdateSupplierPayload,
): Promise<SupplierListItem> {
  const { data } = await apiClient.patch<SupplierResponse>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}`,
    payload
  );
  return transformSupplier(data.supplier);
}

/**
 * Deletes a supplier
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  await apiClient.delete<{ success: boolean }>(`${SUPPLIERS_ENDPOINT}/${supplierId}`);
}

/**
 * Fetches catalog items for a supplier
 */
export async function listCatalogItems(
  supplierId: string,
  filters: SupplierCatalogFilters,
) {
  const params: Record<string, string> = {
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  };
  
  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }
  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }

  const { data, meta } = await apiClient.get<CatalogItemsResponse>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/catalog`,
    params
  );

  return {
    items: data.items.map((item) => ({
      ...transformCatalogItem(item),
      links: Array.isArray(item.ingredient_supplier_links)
        ? (item.ingredient_supplier_links as Array<Record<string, unknown>>).map((link) => ({
            id: String(link.id ?? ""),
            storeIngredientId: String(link.store_ingredient_id ?? ""),
            ingredientName: ((link.store_ingredients as Record<string, unknown>)?.name ?? "—") as string,
            baseUom: ((link.store_ingredients as Record<string, unknown>)?.base_uom ?? null) as string | null,
            preferred: Boolean(link.preferred),
            lastPurchasePrice:
              typeof link.last_purchase_price === "number"
                ? link.last_purchase_price
                : null,
            lastPurchasedAt: (link.last_purchased_at ?? null) as string | null,
          }))
        : [],
    })) as SupplierCatalogWithLinks[],
    meta: (meta as SupplierListMeta | null) ?? null,
  };
}

/**
 * Creates a new catalog item
 */
export async function createCatalogItem(
  payload: CreateCatalogItemPayload,
): Promise<SupplierCatalogItem> {
  const { data } = await apiClient.post<CatalogItemResponse>(
    `${SUPPLIERS_ENDPOINT}/${payload.supplierId}/catalog`,
    payload
  );
  return transformCatalogItem(data.item);
}

/**
 * Updates a catalog item
 */
export async function updateCatalogItem(
  supplierId: string,
  catalogItemId: string,
  payload: UpdateCatalogItemPayload,
): Promise<SupplierCatalogItem> {
  const { data } = await apiClient.patch<CatalogItemResponse>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/catalog/${catalogItemId}`,
    payload
  );
  return transformCatalogItem(data.item);
}

/**
 * Toggles catalog item active status
 */
export async function toggleCatalogItem(
  supplierId: string,
  catalogItemId: string,
  isActive: boolean,
): Promise<SupplierCatalogItem> {
  return updateCatalogItem(supplierId, catalogItemId, { isActive });
}

/**
 * Deletes a catalog item
 */
export async function deleteCatalogItem(
  supplierId: string,
  catalogItemId: string,
): Promise<void> {
  await apiClient.delete<{ success: boolean }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/catalog/${catalogItemId}`
  );
}

/**
 * Fetches orders for a supplier
 */
export async function listSupplierOrders(
  supplierId: string,
  filters: SupplierOrderFilters,
) {
  const params: Record<string, string> = {
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  };
  
  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }
  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }

  const { data, meta } = await apiClient.get<SupplierOrdersResponse>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/transactions`,
    params
  );

  return {
    items: data.items,
    meta: (meta as SupplierListMeta | null) ?? null,
  };
}

/**
 * Creates a supplier link
 */
export async function createSupplierLink(
  supplierId: string,
  payload: CreateSupplierLinkPayload,
): Promise<{ linkId: string }> {
  const { data } = await apiClient.post<{ linkId: string }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/links`,
    payload
  );
  return data;
}

/**
 * Updates a supplier link
 */
export async function updateSupplierLink(
  supplierId: string,
  linkId: string,
  payload: UpdateSupplierLinkPayload,
): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch<{ success: boolean }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/links/${linkId}`,
    payload
  );
  return data;
}

/**
 * Deletes a supplier link
 */
export async function deleteSupplierLink(
  supplierId: string,
  linkId: string,
): Promise<void> {
  await apiClient.delete<{ success: boolean }>(
    `${SUPPLIERS_ENDPOINT}/${supplierId}/links/${linkId}`
  );
}
