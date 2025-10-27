import { redirect } from "next/navigation";

import {
  PurchaseOrdersTable,
  type PurchaseOrderCatalogItem,
  type PurchaseOrderCatalogLink,
} from "./PurchaseOrdersTable";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { purchaseOrderFiltersSchema } from "@/features/procurements/purchase-orders/schemas";
import type {
  PurchaseOrderListItem,
} from "@/features/procurements/purchase-orders/types";
import { parsePurchaseOrderItems } from "@/features/procurements/purchase-orders/types";
import { parseSupplierContact } from "@/features/procurements/suppliers/types";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 25;

export default async function PurchaseOrdersPage() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const filters = purchaseOrderFiltersSchema.parse({
      page: "1",
      pageSize: String(DEFAULT_PAGE_SIZE),
    });

    const { data, error, count } = await actor.supabase
      .from("purchase_orders")
      .select("*")
      .order("issued_at", { ascending: false, nullsFirst: false })
      .range(0, filters.pageSize - 1);

    if (error) {
      throw error;
    }

    const purchaseOrders: PurchaseOrderListItem[] =
      data?.map((row) => ({
        id: row.id,
        status: row.status,
        items: parsePurchaseOrderItems(row.items ?? []),
        totals:
          row.totals && typeof row.totals === "object" && !Array.isArray(row.totals)
            ? (row.totals as Record<string, unknown>)
            : {},
        issued_at: row.issued_at ?? null,
        completed_at: row.completed_at ?? null,
        created_at: row.issued_at ?? new Date().toISOString(),
      })) ?? [];

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
    const suppliers = suppliersData.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      is_active: supplier.is_active,
      contact: parseSupplierContact(supplier.contact ?? null),
      catalogCount: 0,
      created_at: supplier.created_at,
    }));

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
        links,
      };
    });
    const initialMeta = {
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? purchaseOrders.length,
      },
      filters: {
        status: filters.status,
        search: filters.search ?? null,
      },
    };

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">
            Create and track purchase orders to keep ingredient stock in sync.
          </p>
        </div>
        <PurchaseOrdersTable
          initialPurchaseOrders={purchaseOrders}
          initialMeta={initialMeta}
          suppliers={suppliers}
          catalogItems={catalogItems}
          canManage={actor.roles.isAdmin || actor.roles.isManager}
        />
      </div>
    );
  } catch (error) {
    console.error("[PURCHASE_ORDERS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }
}
