import type { Tables } from "@/lib/types/database";

export type StockAdjustmentRow = Tables<"stock_adjustments">;

export type StockAdjustmentItem = {
  ingredientId: string;
  deltaQty: number;
  countedQty: number;
  reason: string;
};

export type StockAdjustment = {
  id: string;
  status: "draft" | "approved";
  notes: string;
  items: StockAdjustmentItem[];
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
};

export type CreateStockAdjustmentPayload = {
  notes: string;
  items: Array<{
    ingredientId: string;
    countedQty: number;
  }>;
  commit: boolean;
};
