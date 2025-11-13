import type { Tables } from "@/lib/types/database";

export type StoreIngredientRow = Tables<"store_ingredients">;

export type StoreIngredientListItem = {
  id: string;
  name: string;
  sku: string | null;
  baseUom: StoreIngredientRow["base_uom"];
  minStock: number;
  currentStock: number;
  avgCost: number;
  isActive: boolean;
  lastPurchasePrice: number | null;
  lastPurchaseAt: string | null;
  lastSupplierName: string | null;
  lastSupplierId: string | null;
};

export type StoreIngredientDetail = StoreIngredientListItem & {
  createdAt: string;
};

export type PurchaseHistoryEntry = {
  purchaseOrderId: string;
  status: "draft" | "pending" | "complete";
  supplierId: string | null;
  supplierName: string | null;
  qty: number;
  baseUom: StoreIngredientRow["base_uom"];
  price: number;
  lineTotal: number;
  issuedAt: string | null;
  completedAt: string | null;
};
