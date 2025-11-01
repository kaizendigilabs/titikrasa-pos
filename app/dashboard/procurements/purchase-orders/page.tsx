import { redirect } from "next/navigation";

import { PurchaseOrdersTableScreen } from "@/features/procurements/purchase-orders/ui/components/purchase-orders-table";
import {
  type PurchaseOrderCatalogItem,
  type PurchaseOrderCatalogLink,
  type PurchaseOrderSupplier,
} from "@/features/procurements/purchase-orders/model/view-model";
import { purchaseOrderFiltersSchema } from "@/features/procurements/purchase-orders/model/forms/schema";
import { mapPurchaseOrderRow, type RawPurchaseOrderRow } from "@/features/procurements/purchase-orders/data/dto";
import type { PurchaseOrderListItem } from "@/features/procurements/purchase-orders/types";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";

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
      .select("*", { count: "exact" })
      .order("issued_at", { ascending: false, nullsFirst: false })
      .range(0, filters.pageSize - 1);

    if (error) {
      throw error;
    }

    const initialItems: PurchaseOrderListItem[] =
      data?.map((row) =>
        mapPurchaseOrderRow(row as RawPurchaseOrderRow),
      ) ?? [];

    const suppliersPromise = actor.supabase
      .from("suppliers")
      .select("id, name, is_active, created_at")
      .order("name", { ascending: true });

    const catalogPromise = actor.supabase
      .from("supplier_catalog_items")
      .select(
        `
          id,
          supplier_id,
          name,
          base_uom,
          purchase_price,
          is_active,
          created_at,
          ingredient_supplier_links (
            id,
            store_ingredient_id,
            preferred,
            store_ingredients ( name, base_uom )
          )
        `,
      )
      .order("created_at", { ascending: false });

    const [suppliersResult, catalogResult] = await Promise.allSettled([
      suppliersPromise,
      catalogPromise,
    ]);

    const suppliers: PurchaseOrderSupplier[] =
      suppliersResult.status === "fulfilled" && !suppliersResult.value.error
        ? (suppliersResult.value.data ?? []).map((supplier) => ({
            id: supplier.id,
            name: supplier.name,
            isActive: supplier.is_active,
          }))
        : [];
    if (suppliersResult.status === "fulfilled" && suppliersResult.value.error) {
      console.error("[PO_SUPPLIERS_ERROR]", suppliersResult.value.error);
    }

    const catalogItems: PurchaseOrderCatalogItem[] =
      catalogResult.status === "fulfilled" && !catalogResult.value.error
        ? (catalogResult.value.data ?? []).map((row) => {
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
              supplierId: row.supplier_id,
              name: row.name,
              baseUom: row.base_uom,
              purchasePrice: row.purchase_price ?? 0,
              isActive: row.is_active,
              createdAt: row.created_at,
              links,
            } satisfies PurchaseOrderCatalogItem;
          })
        : [];
    if (catalogResult.status === "fulfilled" && catalogResult.value.error) {
      console.error("[PO_CATALOG_ERROR]", catalogResult.value.error);
    }

    const initialMeta = {
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? initialItems.length,
      },
      filters: {
        status: filters.status,
        search: filters.search ?? null,
      },
    } as const;

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">
            Create and track purchase orders to keep ingredient stock in sync.
          </p>
        </div>
        <PurchaseOrdersTableScreen
          initialItems={initialItems}
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
