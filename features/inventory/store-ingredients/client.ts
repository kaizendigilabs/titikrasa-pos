import type {
  PurchaseHistoryFilters,
  StoreIngredientFilters,
  UpdateStoreIngredientInput,
} from "./schemas";
import type {
  PurchaseHistoryEntry,
  StoreIngredientDetail,
  StoreIngredientListItem,
} from "./types";
import { AppError, ERR } from "@/lib/utils/errors";
import type { CreateStoreIngredientInput } from "./schemas";

const ENDPOINT = "/api/inventory/store-ingredients" as const;

type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

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

async function request<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
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

function buildSearchParams(filters: Partial<Record<string, unknown>>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  return params;
}

export async function listStoreIngredients(
  filters: StoreIngredientFilters,
): Promise<StoreIngredientListResult> {
  const params = buildSearchParams(filters);
  const { data, meta } = await request<{ storeIngredients: StoreIngredientListItem[] }>(
    `${ENDPOINT}?${params.toString()}`,
  );
  return {
    items: data.storeIngredients,
    meta: (meta as StoreIngredientListMeta | null) ?? null,
  };
}

export async function getStoreIngredient(
  ingredientId: string,
): Promise<StoreIngredientDetail> {
  const { data } = await request<{ storeIngredient: StoreIngredientDetail }>(
    `${ENDPOINT}/${ingredientId}`,
  );
  return data.storeIngredient;
}

export async function listPurchaseHistory(
  ingredientId: string,
  filters: PurchaseHistoryFilters,
): Promise<{
  items: PurchaseHistoryEntry[];
  meta: PurchaseHistoryMeta | null;
}> {
  const params = buildSearchParams(filters);
  const { data, meta } = await request<{ purchases: PurchaseHistoryEntry[] }>(
    `${ENDPOINT}/${ingredientId}/purchase-history?${params.toString()}`,
  );
  return {
    items: data.purchases,
    meta: (meta as PurchaseHistoryMeta | null) ?? null,
  };
}

export async function exportPurchaseHistoryCsv(
  ingredientId: string,
  filters: PurchaseHistoryFilters,
): Promise<Blob> {
  const params = buildSearchParams({ ...filters, format: "csv" });
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

export async function updateStoreIngredient(
  ingredientId: string,
  payload: UpdateStoreIngredientInput,
): Promise<StoreIngredientDetail> {
  const { data } = await request<{ storeIngredient: StoreIngredientDetail }>(
    `${ENDPOINT}/${ingredientId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return data.storeIngredient;
}

export async function createStoreIngredient(
  payload: CreateStoreIngredientInput,
): Promise<StoreIngredientDetail> {
  const { data } = await request<{ storeIngredient: StoreIngredientDetail }>(ENDPOINT, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.storeIngredient;
}
