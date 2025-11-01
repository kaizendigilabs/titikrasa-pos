import { parseSupplierContact } from "../types";
import type {
  IngredientSupplierLink,
  SupplierCatalogItem,
  SupplierCatalogRow,
  SupplierListItem,
  SupplierRow,
} from "../types";

export type SupplierRowWithAgg = SupplierRow & {
  supplier_catalog_items?: Array<{ count: number | null }> | null;
};

export function mapSupplierRow(row: SupplierRowWithAgg): SupplierListItem {
  const catalogAgg = Array.isArray(row.supplier_catalog_items)
    ? row.supplier_catalog_items[0]?.count ?? 0
    : 0;

  return {
    id: row.id,
    name: row.name,
    is_active: Boolean(row.is_active),
    contact: parseSupplierContact(row.contact ?? null),
    catalogCount: typeof catalogAgg === "number" ? catalogAgg : 0,
    created_at: row.created_at,
  };
}

export function mapCatalogRow(row: SupplierCatalogRow): SupplierCatalogItem {
  return {
    id: row.id,
    supplier_id: row.supplier_id,
    name: row.name,
    base_uom: row.base_uom,
    purchase_price: row.purchase_price,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

type CatalogLinkRow = {
  id: string;
  store_ingredient_id: string;
  preferred: boolean | null;
  last_purchase_price: number | null;
  last_purchased_at: string | null;
  store_ingredients?: {
    name: string | null;
    base_uom: string | null;
  } | null;
};

export function mapCatalogLinkRow(row: CatalogLinkRow): IngredientSupplierLink {
  return {
    id: String(row.id),
    storeIngredientId: String(row.store_ingredient_id),
    ingredientName: row.store_ingredients?.name ?? "—",
    baseUom: row.store_ingredients?.base_uom ?? null,
    preferred: Boolean(row.preferred),
    lastPurchasePrice: row.last_purchase_price ?? null,
    lastPurchasedAt: row.last_purchased_at ?? null,
  };
}
