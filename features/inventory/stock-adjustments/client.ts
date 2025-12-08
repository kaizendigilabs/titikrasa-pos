import { apiClient } from "@/lib/api/client";

import type {
  CreateStockAdjustmentPayload,
  StockAdjustment,
} from "./types";

const ENDPOINT = "/api/inventory/stock-adjustments" as const;

type StockAdjustmentResponse = {
  adjustment: StockAdjustment;
};

/**
 * Creates a new stock adjustment
 */
export async function createStockAdjustment(payload: CreateStockAdjustmentPayload) {
  const { data } = await apiClient.post<StockAdjustmentResponse>(
    ENDPOINT,
    payload
  );
  return data.adjustment;
}

