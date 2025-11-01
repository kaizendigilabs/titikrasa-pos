import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/client";

import type {
  PurchaseHistoryEntry,
  StoreIngredientDetail,
  StoreIngredientListItem,
} from "../../types";
import type {
  PurchaseHistoryFilters,
  StoreIngredientFilters,
  UpdateStoreIngredientPayload,
} from "./forms/schema";

const ENDPOINT = "/api/inventory/store-ingredients" as const;

type StoreIngredientListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: Record<string, unknown> | null;
};

type StoreIngredientListResponse = {
  storeIngredients: StoreIngredientListItem[];
};

type StoreIngredientDetailResponse = {
  storeIngredient: StoreIngredientDetail;
};

type PurchaseHistoryResponse = {
  purchases: PurchaseHistoryEntry[];
};

function buildSearchParams(filters: Partial<Record<string, unknown>>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  return params;
}

export async function listStoreIngredients(filters: StoreIngredientFilters) {
  const params = buildSearchParams({
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
    search: filters.search,
    lowStockOnly: filters.lowStockOnly,
  });

  const { data, meta } = await apiRequest<StoreIngredientListResponse>(
    `${ENDPOINT}?${params.toString()}`,
    { method: "GET" },
  );

  return {
    items: data.storeIngredients,
    meta: (meta as StoreIngredientListMeta | null) ?? null,
  };
}

export async function getStoreIngredient(ingredientId: string) {
  const { data } = await apiRequest<StoreIngredientDetailResponse>(
    `${ENDPOINT}/${ingredientId}`,
    { method: "GET" },
  );

  return data.storeIngredient;
}

export async function listPurchaseHistory(
  ingredientId: string,
  filters: PurchaseHistoryFilters,
) {
  const params = buildSearchParams({
    page: filters.page,
    pageSize: filters.pageSize,
    supplierId: filters.supplierId,
    from: filters.from,
    to: filters.to,
  });

  const { data, meta } = await apiRequest<PurchaseHistoryResponse>(
    `${ENDPOINT}/${ingredientId}/purchase-history?${params.toString()}`,
    { method: "GET" },
  );

  return {
    items: data.purchases,
    meta: (meta as StoreIngredientListMeta | null) ?? null,
  };
}

export async function exportPurchaseHistoryCsv(
  ingredientId: string,
  filters: PurchaseHistoryFilters,
) {
  const params = buildSearchParams({ ...filters, format: "csv" });
  const response = await fetch(
    `${ENDPOINT}/${ingredientId}/purchase-history?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "text/csv" },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to export purchase history");
  }

  return await response.blob();
}

export async function updateStoreIngredient(
  ingredientId: string,
  payload: UpdateStoreIngredientPayload,
) {
  const { data }: ApiResult<StoreIngredientDetailResponse> = await apiRequest(
    `${ENDPOINT}/${ingredientId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return data.storeIngredient;
}
