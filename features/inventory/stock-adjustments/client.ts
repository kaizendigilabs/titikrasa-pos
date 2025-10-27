import type {
  CreateStockAdjustmentPayload,
  StockAdjustment,
} from "./types";
import { AppError, ERR } from "@/lib/utils/errors";

const ENDPOINT = "/api/inventory/stock-adjustments" as const;

type ApiResponse<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
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

  return payload.data;
}

export async function createStockAdjustment(payload: CreateStockAdjustmentPayload) {
  const data = await request<{ adjustment: StockAdjustment }>(ENDPOINT, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.adjustment;
}

export async function approveStockAdjustment(adjustmentId: string) {
  const data = await request<{ adjustment: StockAdjustment }>(
    `${ENDPOINT}/${adjustmentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "approve" } as const),
    },
  );
  return data.adjustment;
}
