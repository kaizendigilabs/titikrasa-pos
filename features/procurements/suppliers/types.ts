import type { Json, Tables } from "@/lib/types/database";

export type SupplierRow = Tables<"suppliers">;
export type SupplierCatalogRow = Tables<"supplier_catalog_items">;

export type SupplierContact = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
};

export type SupplierListItem = {
  id: string;
  name: string;
  is_active: boolean;
  contact: SupplierContact;
  catalogCount: number;
  created_at: string;
};

export type SupplierCatalogItem = {
  id: string;
  supplier_id: string;
  name: string;
  base_uom: string;
  purchase_price: number;
  is_active: boolean;
  created_at: string;
  links?: IngredientSupplierLink[];
};

export function parseSupplierContact(contact: Json | null): SupplierContact {
  if (!contact || typeof contact !== "object") {
    return {};
  }
  const { name, email, phone, address, note } = contact as Record<string, unknown>;
  return {
    name: typeof name === "string" ? name : null,
    email: typeof email === "string" ? email : null,
    phone: typeof phone === "string" ? phone : null,
    address: typeof address === "string" ? address : null,
    note: typeof note === "string" ? note : null,
  };
}

export type IngredientSupplierLink = {
  id: string;
  storeIngredientId: string;
  ingredientName: string;
  baseUom: string | null;
  preferred: boolean;
  lastPurchasePrice: number | null;
  lastPurchasedAt: string | null;
};
