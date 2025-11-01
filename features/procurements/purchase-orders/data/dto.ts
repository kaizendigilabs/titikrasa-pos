import type { Tables } from "@/lib/types/database";

import { parsePurchaseOrderItems, type PurchaseOrderListItem } from "../types";

export type RawPurchaseOrderRow = Tables<"purchase_orders"> & {
  totals?: Record<string, unknown> | null;
};

export function mapPurchaseOrderRow(row: RawPurchaseOrderRow): PurchaseOrderListItem {
  return {
    id: row.id,
    status: row.status,
    items: parsePurchaseOrderItems(row.items ?? []),
    totals: typeof row.totals === "object" && row.totals !== null ? row.totals : {},
    issued_at: row.issued_at ?? null,
    completed_at: row.completed_at ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  } satisfies PurchaseOrderListItem;
}
