import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PurchaseHistoryFilters,
  StoreIngredientFilters,
  UpdateStoreIngredientInput,
} from "./model/forms/schema";
import type {
  PurchaseHistoryEntry,
  StoreIngredientDetail,
  StoreIngredientListItem,
  StoreIngredientRow,
} from "./types.ts";
import { adminClient, ensureAdminOrManager } from "@/features/users/server";
import type { ActorContext } from "@/features/users/server";
import type { Database } from "@/lib/types/database";
import { ERR, appError } from "@/lib/utils/errors";

type AdminSupabase = SupabaseClient<Database>;

const MAX_PAGE_SIZE = 200;

function resolveClient(client?: AdminSupabase) {
  return client ?? adminClient();
}

type IngredientLinkRow = {
  store_ingredient_id: string;
  preferred: boolean;
  last_purchase_price: number | null;
  last_purchased_at: string | null;
  supplier_catalog_items: null | {
    supplier_id: string | null;
    suppliers: {
      name: string | null;
    };
  };
};

function pickLatestLink(rows: IngredientLinkRow[]) {
  const map = new Map<string, IngredientLinkRow>();

  for (const row of rows) {
    const existing = map.get(row.store_ingredient_id);
    if (!existing) {
      map.set(row.store_ingredient_id, row);
      continue;
    }

    const existingTimestamp = existing.last_purchased_at
      ? Date.parse(existing.last_purchased_at)
      : Number.NEGATIVE_INFINITY;
    const candidateTimestamp = row.last_purchased_at
      ? Date.parse(row.last_purchased_at)
      : Number.NEGATIVE_INFINITY;

    if (candidateTimestamp > existingTimestamp) {
      map.set(row.store_ingredient_id, row);
      continue;
    }

    if (candidateTimestamp === existingTimestamp && row.preferred && !existing.preferred) {
      map.set(row.store_ingredient_id, row);
    }
  }

  return map;
}

function mapToListItem(
  row: StoreIngredientRow,
  linkMap: Map<string, IngredientLinkRow>,
): StoreIngredientListItem {
  const link = linkMap.get(row.id);
  const supplierName = link?.supplier_catalog_items?.suppliers?.name ?? null;

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    baseUom: row.base_uom,
    minStock: row.min_stock,
    currentStock: row.current_stock,
    avgCost: row.avg_cost,
    isActive: row.is_active,
    lastPurchasePrice: link?.last_purchase_price ?? null,
    lastPurchaseAt: link?.last_purchased_at ?? null,
    lastSupplierName: supplierName,
  };
}

export async function fetchStoreIngredients(
  filters: StoreIngredientFilters,
  client?: AdminSupabase,
) {
  const supabase = resolveClient(client);

  const limit = Math.min(filters.pageSize, MAX_PAGE_SIZE);
  const offset = (filters.page - 1) * limit;
  const rangeTo = offset + limit - 1;

  let query = supabase
    .from("store_ingredients")
    .select("*", { count: "exact" })
    .order("name", { ascending: true });

  if (filters.status !== "all") {
    query = query.eq("is_active", filters.status === "active");
  }

  if (filters.search && filters.search.length > 0) {
    const pattern = `%${filters.search}%`;
    query = query.or(`name.ilike.${pattern},sku.ilike.${pattern}`);
  }

  const applyRange = !filters.lowStockOnly;
  if (applyRange) {
    query = query.range(offset, rangeTo);
  }

  const { data, error, count } = await query;
  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to fetch store ingredients",
      details: { hint: error.message },
    });
  }

  const allRows = (data ?? []) as StoreIngredientRow[];

  let filteredRows = allRows;
  let total = count ?? allRows.length;

  if (filters.lowStockOnly) {
    filteredRows = allRows.filter((row) => row.current_stock <= row.min_stock);
    total = filteredRows.length;
    filteredRows = filteredRows.slice(offset, offset + limit);
  }

  const ingredientIds = filteredRows.map((row) => row.id);
  let linkMap = new Map<string, IngredientLinkRow>();

  if (ingredientIds.length > 0) {
    const { data: links, error: linksError } = await supabase
      .from("ingredient_supplier_links")
      .select(
        "store_ingredient_id, preferred, last_purchase_price, last_purchased_at, supplier_catalog_items ( supplier_id, suppliers ( name ) )",
      )
      .in("store_ingredient_id", ingredientIds)
      .order("last_purchased_at", { ascending: false });

    if (linksError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch supplier metadata",
        details: { hint: linksError.message },
      });
    }

    const rows = Array.isArray(links) ? (links as IngredientLinkRow[]) : [];
    linkMap = pickLatestLink(rows);
  }

  const items = filteredRows.map((row) => mapToListItem(row, linkMap));

  return {
    items,
    total,
    limit,
    offset,
  };
}

export async function fetchStoreIngredientDetail(
  ingredientId: string,
  client?: AdminSupabase,
): Promise<StoreIngredientDetail> {
  const supabase = resolveClient(client);

  const { data, error } = await supabase
    .from("store_ingredients")
    .select("*")
    .eq("id", ingredientId)
    .single();

  if (error || !data) {
    throw appError(ERR.NOT_FOUND, {
      message: "Ingredient not found",
    });
  }

  const baseRow = data as StoreIngredientRow;

  let linkMap = new Map<string, IngredientLinkRow>();
  const { data: links, error: linksError } = await supabase
    .from("ingredient_supplier_links")
    .select(
      "store_ingredient_id, preferred, last_purchase_price, last_purchased_at, supplier_catalog_items ( supplier_id, suppliers ( name ) )",
    )
    .eq("store_ingredient_id", ingredientId);

  if (linksError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to fetch supplier metadata",
      details: { hint: linksError.message },
    });
  }

  if (Array.isArray(links) && links.length > 0) {
    linkMap = pickLatestLink(links as IngredientLinkRow[]);
  }

  const listItem = mapToListItem(baseRow, linkMap);

  return {
    ...listItem,
    createdAt: baseRow.created_at,
  };
}

export async function fetchPurchaseHistory(
  ingredientId: string,
  filters: PurchaseHistoryFilters,
  client?: AdminSupabase,
): Promise<{
  items: PurchaseHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}> {
  const supabase = resolveClient(client);
  const limit = Math.min(filters.pageSize, MAX_PAGE_SIZE);
  const offset = (filters.page - 1) * limit;
  const rangeTo = offset + limit - 1;

  let query = supabase
    .from("purchase_order_item_entries" as any)
    .select("*", { count: "exact" })
    .eq("store_ingredient_id", ingredientId)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .range(offset, rangeTo);

  if (filters.supplierId) {
    query = query.eq("supplier_id", filters.supplierId);
  }

  if (filters.from) {
    query = query.gte("completed_at", filters.from);
  }

  if (filters.to) {
    query = query.lte("completed_at", filters.to);
  }

  const { data, error, count } = await query;
  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to fetch purchase history",
      details: { hint: error.message },
    });
  }

  const rows = Array.isArray(data) ? data : [];
  const supplierIds = rows
    .map((row: any) => row.supplier_id)
    .filter((value: string | null): value is string => Boolean(value));

  let suppliers = new Map<string, string>();
  if (supplierIds.length > 0) {
    const { data: supplierRows, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("id", Array.from(new Set(supplierIds)));

    if (supplierError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch suppliers",
        details: { hint: supplierError.message },
      });
    }

    suppliers = new Map(
      (supplierRows ?? []).map((row) => [row.id as string, row.name as string]),
    );
  }

  const items: PurchaseHistoryEntry[] = rows.map((row: any) => ({
    purchaseOrderId: row.purchase_order_id,
    status: row.status,
    supplierId: row.supplier_id ?? null,
    supplierName: row.supplier_id ? suppliers.get(row.supplier_id) ?? null : null,
    qty: row.qty ?? 0,
    baseUom: row.base_uom,
    price: row.price ?? 0,
    lineTotal: (row.qty ?? 0) * (row.price ?? 0),
    issuedAt: row.issued_at ?? null,
    completedAt: row.completed_at ?? null,
  }));

  return {
    items,
    total: count ?? items.length,
    limit,
    offset,
  };
}

export async function updateStoreIngredientMeta(
  actor: ActorContext,
  ingredientId: string,
  payload: UpdateStoreIngredientInput,
  client?: AdminSupabase,
): Promise<StoreIngredientDetail> {
  ensureAdminOrManager(actor.roles);
  const supabase = resolveClient(client);

  const updates: Partial<Database["public"]["Tables"]["store_ingredients"]["Update"]> = {};

  if (payload.sku !== undefined) {
    updates.sku = payload.sku;
  }
  if (payload.minStock !== undefined) {
    updates.min_stock = payload.minStock;
  }
  if (payload.isActive !== undefined) {
    updates.is_active = payload.isActive;
  }

  if (Object.keys(updates).length === 0) {
    throw appError(ERR.BAD_REQUEST, {
      message: "No changes provided",
    });
  }

  const { error: updateError } = await supabase
    .from("store_ingredients")
    .update(updates)
    .eq("id", ingredientId);

  if (updateError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to update store ingredient",
      details: { hint: updateError.message },
    });
  }

  return await fetchStoreIngredientDetail(ingredientId, supabase);
}
