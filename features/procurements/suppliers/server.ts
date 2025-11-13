import { appError, ERR } from "@/lib/utils/errors";
import type { ActorContext } from "@/features/users/server";
import { supplierFiltersSchema } from "./schemas";
import { parseSupplierContact } from "./types";
import type {
  SupplierListItem,
  SupplierCatalogItem,
  IngredientSupplierLink,
  SupplierDetailBootstrap,
  SupplierOrder,
  SupplierDetailStats,
  SupplierCatalogWithLinks,
} from "./types";

export async function getSuppliersTableBootstrap(
  actor: ActorContext,
  options: { pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? 50;
  const filters = supplierFiltersSchema.parse({
    page: "1",
    pageSize: String(pageSize),
    status: "all",
  });

  const { data, error, count } = await actor.supabase
    .from("suppliers")
    .select("*, supplier_catalog_items(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, filters.pageSize - 1);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load suppliers",
      details: { hint: error.message },
    });
  }

  const initialSuppliers: SupplierListItem[] =
    data?.map((row) => ({
      id: row.id,
      name: row.name,
      is_active: row.is_active,
      contact: parseSupplierContact(row.contact ?? null),
      created_at: row.created_at,
      catalogCount: Array.isArray(row.supplier_catalog_items)
        ? row.supplier_catalog_items[0]?.count ?? 0
        : 0,
    })) ?? [];

  return {
    initialSuppliers,
    initialMeta: {
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? initialSuppliers.length,
      },
      filters: {
        search: null as string | null,
        status: "all" as const,
      },
    },
  };
}

type PurchaseOrderEntryRow = {
  purchase_order_id: string;
  status: string;
  issued_at: string | null;
  completed_at: string | null;
  qty: number | null;
  price: number | null;
};

export function normalizePurchaseOrderEntries(
  rows: Array<Record<string, any>> = [],
): PurchaseOrderEntryRow[] {
  return rows.flatMap((row) => {
    if (!row.purchase_order_id) return [];
    const qtyValue = Number(row.qty);
    const priceValue = Number(row.price);
    return [
      {
        purchase_order_id: String(row.purchase_order_id),
        status: typeof row.status === "string" ? row.status : "draft",
        issued_at: row.issued_at ?? null,
        completed_at: row.completed_at ?? null,
        qty: Number.isFinite(qtyValue) ? qtyValue : null,
        price: Number.isFinite(priceValue) ? priceValue : null,
      },
    ];
  });
}

const MAX_PURCHASE_ORDER_ROWS = 600;

export function aggregateSupplierPurchaseOrders(
  rows: PurchaseOrderEntryRow[],
): { orders: SupplierOrder[]; stats: Omit<SupplierDetailStats, "activeCatalogItems"> } {
  const map = new Map<string, SupplierOrder>();

  for (const row of rows) {
    const id = row.purchase_order_id;
    if (!id) continue;
    const qty = typeof row.qty === "number" ? row.qty : 0;
    const price = typeof row.price === "number" ? row.price : 0;
    const existing = map.get(id) ?? {
      id,
      status: row.status ?? "draft",
      issuedAt: row.issued_at ?? null,
      completedAt: row.completed_at ?? null,
      itemCount: 0,
      totalAmount: 0,
    };
    existing.status = row.status ?? existing.status;
    existing.issuedAt = existing.issuedAt ?? row.issued_at ?? null;
    existing.completedAt = existing.completedAt ?? row.completed_at ?? null;
    existing.itemCount += qty;
    existing.totalAmount += price * qty;
    map.set(id, existing);
  }

  const orders = Array.from(map.values()).sort((a, b) => {
    const aTime = a.issuedAt ? new Date(a.issuedAt).getTime() : 0;
    const bTime = b.issuedAt ? new Date(b.issuedAt).getTime() : 0;
    return bTime - aTime;
  });

  const totalPurchaseOrders = orders.length;
  const pendingPurchaseOrders = orders.filter(
    (order) => order.status !== "complete",
  ).length;
  const totalSpend = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return {
    orders,
    stats: {
      totalPurchaseOrders,
      pendingPurchaseOrders,
      totalSpend,
    },
  };
}

export async function getSupplierDetail(
  actor: ActorContext,
  supplierId: string,
): Promise<SupplierDetailBootstrap> {
  const { data: supplierRow, error: supplierError } = await actor.supabase
    .from("suppliers")
    .select("*, supplier_catalog_items(count)")
    .eq("id", supplierId)
    .maybeSingle();

  if (supplierError || !supplierRow) {
    throw appError(ERR.NOT_FOUND, {
      message: "Supplier not found",
    });
  }

  const supplier: SupplierListItem = {
    id: supplierRow.id,
    name: supplierRow.name,
    is_active: supplierRow.is_active,
    contact: parseSupplierContact(supplierRow.contact ?? null),
    created_at: supplierRow.created_at,
    catalogCount: Array.isArray(supplierRow.supplier_catalog_items)
      ? supplierRow.supplier_catalog_items[0]?.count ?? 0
      : 0,
  };

  const { data: catalogRows, error: catalogError } = await actor.supabase
    .from("supplier_catalog_items")
    .select(
      `*, ingredient_supplier_links (
        id,
        store_ingredient_id,
        preferred,
        last_purchase_price,
        last_purchased_at,
        store_ingredients ( name, base_uom )
      )`,
    )
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (catalogError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load supplier catalog",
      details: { hint: catalogError.message },
    });
  }

  const catalog: SupplierCatalogWithLinks[] = (catalogRows ?? []).map((row) => {
    const linksData = Array.isArray(row.ingredient_supplier_links)
      ? row.ingredient_supplier_links
      : [];
    const links: IngredientSupplierLink[] = linksData.map((link: any) => ({
      id: String(link.id ?? ""),
      storeIngredientId: String(link.store_ingredient_id ?? ""),
      ingredientName: link.store_ingredients?.name ?? "—",
      baseUom: link.store_ingredients?.base_uom ?? null,
      preferred: Boolean(link.preferred),
      lastPurchasePrice:
        typeof link.last_purchase_price === "number"
          ? link.last_purchase_price
          : null,
      lastPurchasedAt: link.last_purchased_at ?? null,
    }));
    const catalogItem: SupplierCatalogItem = {
      id: row.id,
      supplier_id: row.supplier_id,
      name: row.name,
      base_uom: row.base_uom,
      purchase_price: row.purchase_price,
      is_active: row.is_active,
      created_at: row.created_at,
    };
    return {
      ...catalogItem,
      links,
    };
  });

  const { data: poEntryRows, error: poEntryError } = await actor.supabase
    .from("purchase_order_item_entries")
    .select(
      "purchase_order_id, status, issued_at, completed_at, qty, price",
    )
    .eq("supplier_id", supplierId)
    .order("issued_at", { ascending: false })
    .limit(MAX_PURCHASE_ORDER_ROWS);

  if (poEntryError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load purchase order history",
      details: { hint: poEntryError.message },
    });
  }

  const poStats = aggregateSupplierPurchaseOrders(
    normalizePurchaseOrderEntries(poEntryRows ?? []),
  );

  const { data: ingredientsRows, error: ingredientsError } = await actor.supabase
    .from("store_ingredients")
    .select("id, name, base_uom, is_active")
    .order("name", { ascending: true });

  if (ingredientsError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load store ingredients",
      details: { hint: ingredientsError.message },
    });
  }

  const storeIngredients = (ingredientsRows ?? [])
    .filter((row) => row.is_active)
    .map((row) => ({
      id: row.id,
      name: row.name,
      baseUom: row.base_uom,
    }));

  return {
    supplier,
    catalog,
    storeIngredients,
    stats: {
      totalPurchaseOrders: poStats.stats.totalPurchaseOrders,
      pendingPurchaseOrders: poStats.stats.pendingPurchaseOrders,
      totalSpend: poStats.stats.totalSpend,
      activeCatalogItems: catalog.filter((item) => item.is_active).length,
    },
    orders: poStats.orders,
  };
}

export async function getSupplierTransactionsBootstrap(
  actor: ActorContext,
  supplierId: string,
  options: { pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? 10;

  const { data: supplierRow, error: supplierError } = await actor.supabase
    .from("suppliers")
    .select("id, name")
    .eq("id", supplierId)
    .maybeSingle();

  if (supplierError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load supplier",
      details: { hint: supplierError.message },
    });
  }

  if (!supplierRow) {
    throw appError(ERR.NOT_FOUND, { message: "Supplier not found" });
  }

  const { data: entryRows, error: entryError } = await actor.supabase
    .from("purchase_order_item_entries")
    .select(
      "purchase_order_id, status, issued_at, completed_at, qty, price",
    )
    .eq("supplier_id", supplierId)
    .order("issued_at", { ascending: false })
    .limit(MAX_PURCHASE_ORDER_ROWS);

  if (entryError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load supplier transactions",
      details: { hint: entryError.message },
    });
  }

  const aggregated = aggregateSupplierPurchaseOrders(
    normalizePurchaseOrderEntries(entryRows ?? []),
  );
  const initialOrders = aggregated.orders.slice(0, pageSize);

  return {
    supplier: {
      id: supplierRow.id,
      name: supplierRow.name,
    },
    initialOrders,
    initialMeta: {
      pagination: {
        page: 1,
        pageSize,
        total: aggregated.orders.length,
      },
      filters: {
        status: "all" as const,
        search: null as string | null,
      },
    },
  };
}
