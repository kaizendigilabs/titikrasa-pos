import type { Database, Json, Tables } from "@/lib/types/database";

export type PurchaseOrderRow = Tables<"purchase_orders">;

export type PurchaseOrderStatus = PurchaseOrderRow["status"];

export type PurchaseOrderItem = {
  catalogItemId: string;
  storeIngredientId: string;
  qty: number;
  baseUom: Database["public"]["Enums"]["base_uom"];
  price: number;
};

export type PurchaseOrderListItem = {
  id: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totals: Record<string, unknown>;
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
      } satisfies PurchaseOrderItem;
    })
    .filter((item): item is PurchaseOrderItem => Boolean(item));
}
