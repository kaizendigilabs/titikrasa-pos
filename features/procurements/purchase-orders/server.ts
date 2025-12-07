import { appError, ERR } from "@/lib/utils/errors";
import type { ActorContext } from "@/features/users/server";
import { purchaseOrderFiltersSchema } from "./schemas";
import { parseGrandTotal, parsePurchaseOrderItems } from "./types";
import type {
  PurchaseOrderCatalogItem,
  PurchaseOrderCatalogLink,
  PurchaseOrderListItem,
  PurchaseOrderSupplierOption,
} from "./types";

export type PurchaseOrderFormOptions = {
  suppliers: PurchaseOrderSupplierOption[];
  catalogItems: PurchaseOrderCatalogItem[];
};

export type PurchaseOrdersTableBootstrap = {
  initialPurchaseOrders: PurchaseOrderListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: string;
      search: string | null;
      supplierId: string | null;
      issuedFrom: string | null;
      issuedTo: string | null;
    };
  };
} & PurchaseOrderFormOptions;

export async function getPurchaseOrderFormOptions(
  actor: ActorContext,
): Promise<PurchaseOrderFormOptions> {
  const suppliersPromise = actor.supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });

  const catalogPromise = actor.supabase
    .from("supplier_catalog_items")
    .select(
      "*, ingredient_supplier_links ( id, store_ingredient_id, preferred, store_ingredients(name, base_uom) )",
    )
    .order("created_at", { ascending: false });

  const [suppliersResult, catalogResult] = await Promise.allSettled([
    suppliersPromise,
    catalogPromise,
  ]);

  const suppliersData =
    suppliersResult.status === "fulfilled" && !suppliersResult.value.error
      ? suppliersResult.value.data ?? []
      : [];
  if (
    suppliersResult.status === "fulfilled" &&
    suppliersResult.value.error
  ) {
    console.error("[PO_SUPPLIERS_ERROR]", suppliersResult.value.error);
  }

  const catalogData =
    catalogResult.status === "fulfilled" && !catalogResult.value.error
      ? catalogResult.value.data ?? []
      : [];
  if (
    catalogResult.status === "fulfilled" &&
    catalogResult.value.error
  ) {
    console.error("[PO_CATALOG_ERROR]", catalogResult.value.error);
  }

  const suppliers: PurchaseOrderSupplierOption[] = suppliersData.map(
    (supplier) => ({
      id: supplier.id,
      name: supplier.name,
      is_active: supplier.is_active,
    }),
  );

  const catalogItems: PurchaseOrderCatalogItem[] = catalogData.map((row) => {
    const linksData = Array.isArray(row.ingredient_supplier_links)
      ? row.ingredient_supplier_links
      : [];
    const links: PurchaseOrderCatalogLink[] = linksData
      .map((link: any) => ({
        id: String(link.id ?? ""),
        storeIngredientId: String(link.store_ingredient_id ?? ""),
        ingredientName: link.store_ingredients?.name ?? "—",
        baseUom: link.store_ingredients?.base_uom ?? null,
        preferred: Boolean(link.preferred),
        lastPurchasePrice: null,
        lastPurchasedAt: null,
      }))
      .filter((link) => link.id);

    return {
      id: row.id,
      supplier_id: row.supplier_id,
      name: row.name,
      base_uom: row.base_uom,
      purchase_price: row.purchase_price ?? 0,
      is_active: row.is_active,
      created_at: row.created_at,
      unit_label: row.unit_label,
      conversion_rate: Number(row.conversion_rate ?? 1),
      links,
    };
  });

  return { suppliers, catalogItems };
}

function resolveSupplierName(row: Record<string, any>): string {
  const supplierData = row.suppliers;
  if (Array.isArray(supplierData)) {
    return supplierData[0]?.name ?? "Unknown supplier";
  }
  if (supplierData && typeof supplierData === "object") {
    return supplierData.name ?? "Unknown supplier";
  }
  return row.supplier_name ?? "Unknown supplier";
}

export async function getPurchaseOrdersTableBootstrap(
  actor: ActorContext,
  options: { pageSize?: number } = {},
): Promise<PurchaseOrdersTableBootstrap> {
  const pageSize = options.pageSize ?? 25;
  const filters = purchaseOrderFiltersSchema.parse({
    page: "1",
    pageSize: String(pageSize),
  });

  const { data, error, count } = await actor.supabase
    .from("purchase_orders")
    .select("*, suppliers(name)", { count: "exact" })
    .order("issued_at", { ascending: false, nullsFirst: false })
    .range(0, filters.pageSize - 1);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load purchase orders",
      details: { hint: error.message },
    });
  }

  const initialPurchaseOrders: PurchaseOrderListItem[] =
    data?.map((row) => {
      const purchaseRow = row as Record<string, any>;
      const createdAt =
        (purchaseRow as { created_at?: string | null }).created_at ??
        new Date().toISOString();
      const totals =
        purchaseRow.totals && typeof purchaseRow.totals === "object" && !Array.isArray(purchaseRow.totals)
          ? (purchaseRow.totals as Record<string, unknown>)
          : {};
      const supplierName = resolveSupplierName(purchaseRow);
      return {
        id: purchaseRow.id,
        status: purchaseRow.status,
        items: parsePurchaseOrderItems(purchaseRow.items ?? []),
        totals,
        supplier_id: purchaseRow.supplier_id ?? "",
        supplier_name: supplierName,
        grand_total: parseGrandTotal(totals),
        issued_at: purchaseRow.issued_at ?? null,
        completed_at: purchaseRow.completed_at ?? null,
        created_at: createdAt,
      };
    }) ?? [];

  const { suppliers, catalogItems } = await getPurchaseOrderFormOptions(actor);

  return {
    initialPurchaseOrders,
    initialMeta: {
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? initialPurchaseOrders.length,
      },
      filters: {
        status: filters.status,
        search: filters.search ?? null,
        supplierId: filters.supplierId ?? null,
        issuedFrom: filters.issuedFrom ?? null,
        issuedTo: filters.issuedTo ?? null,
      },
    },
    suppliers,
    catalogItems,
  };
}
