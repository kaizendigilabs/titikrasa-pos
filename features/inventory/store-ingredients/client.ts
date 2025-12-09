import { apiClient } from "@/lib/api/client";
import { AppError } from "@/lib/utils/errors";

import type {
  PurchaseHistoryFilters,
  StoreIngredientFilters,
  UpdateStoreIngredientInput,
  CreateStoreIngredientInput,
} from "./schemas";
import type {
  PurchaseHistoryEntry,
  StoreIngredientDetail,
  StoreIngredientListItem,
} from "./types";

const ENDPOINT = "/api/inventory/store-ingredients" as const;

type StoreIngredientListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: Record<string, unknown> | null;
};

export type StoreIngredientListResult = {
  items: StoreIngredientListItem[];
  meta: StoreIngredientListMeta | null;
};

export type PurchaseHistoryMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: {
    supplierId: string | null;
    from: string | null;
    to: string | null;
    search: string | null;
  };
};

type StoreIngredientsResponse = {
  storeIngredients: StoreIngredientListItem[];
};

type StoreIngredientResponse = {
  storeIngredient: StoreIngredientDetail;
};

type PurchaseHistoryResponse = {
  purchases: PurchaseHistoryEntry[];
};

/**
 * Builds query params from filters object
 */
function buildSearchParams(filters: Partial<Record<string, unknown>>): Record<string, string> {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params[key] = String(value);
  });
  return params;
}

/**
 * Fetches a paginated list of store ingredients
 */
export async function listStoreIngredients(
  filters: StoreIngredientFilters,
): Promise<StoreIngredientListResult> {
  const params = buildSearchParams(filters);
  const { data, meta } = await apiClient.get<StoreIngredientsResponse>(
    ENDPOINT,
    params
  );
  return {
    items: data.storeIngredients,
    meta: (meta as StoreIngredientListMeta | null) ?? null,
  };
}

/**
 * Fetches a single store ingredient by ID
 */
export async function getStoreIngredient(
  ingredientId: string,
): Promise<StoreIngredientDetail> {
  const { data } = await apiClient.get<StoreIngredientResponse>(
    `${ENDPOINT}/${ingredientId}`
  );
  return data.storeIngredient;
}

/**
 * Fetches purchase history for an ingredient
 */
export async function listPurchaseHistory(
  ingredientId: string,
  filters: PurchaseHistoryFilters,
): Promise<{
  items: PurchaseHistoryEntry[];
  meta: PurchaseHistoryMeta | null;
}> {
  const params = buildSearchParams(filters);
  const { data, meta } = await apiClient.get<PurchaseHistoryResponse>(
    `${ENDPOINT}/${ingredientId}/purchase-history`,
    params
  );
  return {
    items: data.purchases,
    meta: (meta as PurchaseHistoryMeta | null) ?? null,
  };
}

/**
 * Exports purchase history as CSV
 * Note: This uses native fetch since apiClient doesn't support blob responses
 */
export async function exportPurchaseHistoryCsv(
  ingredientId: string,
  filters: PurchaseHistoryFilters,
): Promise<Blob> {
  const params = new URLSearchParams(buildSearchParams({ ...filters, format: "csv" }));
  const response = await fetch(
    `${ENDPOINT}/${ingredientId}/purchase-history?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "text/csv" },
    },
  );

  if (!response.ok) {
    throw new AppError(
      response.status,
      "Failed to export purchase history. Please try again.",
    );
  }

  return await response.blob();
}

/**
 * Updates a store ingredient
 */
export async function updateStoreIngredient(
  ingredientId: string,
  payload: UpdateStoreIngredientInput,
): Promise<StoreIngredientDetail> {
  const { data } = await apiClient.patch<StoreIngredientResponse>(
    `${ENDPOINT}/${ingredientId}`,
    payload
  );
  return data.storeIngredient;
}

/**
 * Creates a new store ingredient
 */
export async function createStoreIngredient(
  payload: CreateStoreIngredientInput,
): Promise<StoreIngredientDetail> {
  const { data } = await apiClient.post<StoreIngredientResponse>(
    ENDPOINT,
    payload
  );
  return data.storeIngredient;
}

/**
 * Deletes a store ingredient (hard delete)
 */
export async function deleteStoreIngredient(ingredientId: string): Promise<void> {
  await apiClient.delete(`${ENDPOINT}/${ingredientId}`);
}
