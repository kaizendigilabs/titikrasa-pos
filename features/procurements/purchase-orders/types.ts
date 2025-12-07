import type { Database, Json, Tables } from "@/lib/types/database";

export type PurchaseOrderRow = Tables<"purchase_orders">;

export type PurchaseOrderStatus = PurchaseOrderRow["status"];

export type PurchaseOrderItem = {
  catalogItemId: string;
  storeIngredientId: string;
  qty: number;
  baseUom: Database["public"]["Enums"]["base_uom"];
  price: number;
  qtyPack?: number;
  packUom?: string;
  conversionRate?: number;
};

export type PurchaseOrderCatalogLink = {
  id: string;
  storeIngredientId: string;
  ingredientName: string;
  baseUom: string | null;
  preferred: boolean;
  lastPurchasePrice: number | null;
  lastPurchasedAt: string | null;
};

export type PurchaseOrderCatalogItem = {
  id: string;
  supplier_id: string;
  name: string;
  base_uom: string;
  purchase_price: number;
  is_active: boolean;
  unit_label?: string | null;
  conversion_rate?: number;
  created_at: string;
  links?: PurchaseOrderCatalogLink[];
};

export type PurchaseOrderSupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
};

export type PurchaseOrderListItem = {
  id: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totals: Record<string, unknown>;
  supplier_id: string;
  supplier_name: string;
  grand_total: number;
  issued_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export function parsePurchaseOrderItems(payload: Json | null): PurchaseOrderItem[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const data = entry as Record<string, unknown>;
      const catalogItemId = String(data.catalog_item_id ?? "");
      const storeIngredientId = String(data.store_ingredient_id ?? "");
      const qtyValue =
        data.qty ??
        data.qty_base ??
        data.qtyBase ??
        data.qty_pack ??
        data.qtyPack ??
        0;
      const priceValue = data.price ?? data.purchase_price ?? 0;
      const baseUomValue =
        data.base_uom ??
        data.baseUom ??
        data.pack_uom ??
        data.packUom ??
        null;

      const qtyNumber = Number(qtyValue);
      const qty = Number.isFinite(qtyNumber) ? Math.max(0, Math.round(qtyNumber)) : 0;
      const priceNumber = Number(priceValue);
      const price = Number.isFinite(priceNumber) ? Math.max(0, Math.round(priceNumber)) : 0;
      const baseUom =
        typeof baseUomValue === "string" && baseUomValue.length > 0
          ? (baseUomValue as Database["public"]["Enums"]["base_uom"])
          : ("pcs" as Database["public"]["Enums"]["base_uom"]);

      if (!catalogItemId || !storeIngredientId || qty <= 0) return null;
      return {
        catalogItemId,
        storeIngredientId,
        qty,
        baseUom,
        price,
        ...(data.qty_pack || data.qtyPack ? { qtyPack: Number(data.qty_pack ?? data.qtyPack) } : {}),
        ...(data.pack_uom || data.packUom ? { packUom: String(data.pack_uom ?? data.packUom) } : {}),
        ...(data.conversion_rate || data.conversionRate ? { conversionRate: Number(data.conversion_rate ?? data.conversionRate) } : {}),
      } satisfies PurchaseOrderItem;
    })
    .filter((item): item is PurchaseOrderItem => Boolean(item));
}

export function parseGrandTotal(
  totals: Json | Record<string, unknown> | null,
): number {
  if (!totals || typeof totals !== "object") return 0;
  const source = totals as Record<string, unknown>;
  const raw = source.grand_total ?? source.grandTotal ?? source.grand;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
