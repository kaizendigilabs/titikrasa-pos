import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  createPurchaseOrderSchema,
  purchaseOrderFiltersSchema,
} from "@/features/procurements/purchase-orders/model/forms/schema";
import { mapPurchaseOrderRow, type RawPurchaseOrderRow } from "@/features/procurements/purchase-orders/data/dto";
import type { PurchaseOrderRow } from "@/features/procurements/purchase-orders/types";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import type { TablesInsert } from "@/lib/types/database";

const MAX_PAGE_SIZE = 200;

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = purchaseOrderFiltersSchema.parse(params);

    const limit = Math.min(filters.pageSize, MAX_PAGE_SIZE);
    const from = (filters.page - 1) * limit;
    const to = from + limit - 1;

    let query = actor.supabase
      .from("purchase_orders")
      .select("*", { count: "exact" })
      .order("issued_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (filters.status !== "all") {
      query = query.eq("status", filters.status as PurchaseOrderRow["status"]);
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      query = query.or(`id.ilike.${pattern}`);
    }

    const { data, error, count } = await query;
    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch purchase orders",
        details: { hint: error.message },
      });
    }

    const purchaseOrders = (data ?? []).map((row) =>
      mapPurchaseOrderRow(row as RawPurchaseOrderRow),
    );

    return ok(
      { purchaseOrders },
      {
        meta: {
          pagination: {
            page: filters.page,
            pageSize: limit,
            total: count ?? purchaseOrders.length,
          },
          filters: {
            status: filters.status,
            search: filters.search ?? null,
          },
        },
      },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const payload = await request.json();
    const body = createPurchaseOrderSchema.parse(payload);

    const admin = adminClient();

    const linkCache = new Map<string, { storeIngredientId: string }>();
    const preparedItems: Array<{
      catalog_item_id: string;
      supplier_id: string;
      store_ingredient_id: string;
      qty: number;
      base_uom: string;
      price: number;
    }> = [];

    let computedTotal = 0;

    for (const item of body.items) {
      const { data: catalog, error: catalogError } = await admin
        .from("supplier_catalog_items")
        .select(
          "id, supplier_id, name, base_uom, purchase_price, ingredient_supplier_links ( id, store_ingredient_id, preferred )",
        )
        .eq("id", item.catalogItemId)
        .single();

      if (catalogError || !catalog) {
        throw appError(ERR.BAD_REQUEST, {
          message: "Invalid catalog item",
          details: { catalogItemId: item.catalogItemId },
        });
      }

      if (catalog.supplier_id !== body.supplierId) {
        throw appError(ERR.BAD_REQUEST, {
          message: "Catalog item does not belong to supplier",
          details: { catalogItemId: item.catalogItemId },
        });
      }

      let storeIngredientId: string | null = null;

      if (linkCache.has(catalog.id)) {
        storeIngredientId = linkCache.get(catalog.id)!.storeIngredientId;
      } else {
        const links: Array<{ id: string; store_ingredient_id: string; preferred: boolean }> =
          catalog.ingredient_supplier_links ?? [];

        let link = links.find((entry) => entry.preferred) ?? links[0] ?? null;

        if (!link) {
          const { data: newIngredient, error: createIngredientError } = await admin
            .from("store_ingredients")
            .insert({
              name: catalog.name,
              base_uom: catalog.base_uom,
              is_active: true,
            })
            .select("id")
            .single();

          if (createIngredientError || !newIngredient) {
            throw appError(ERR.SERVER_ERROR, {
              message: "Failed to create store ingredient",
              details: { hint: createIngredientError?.message },
            });
          }

          const { data: newLink, error: linkError } = await admin
            .from("ingredient_supplier_links")
            .insert({
              catalog_item_id: catalog.id,
              store_ingredient_id: newIngredient.id,
              preferred: true,
            })
            .select("id, store_ingredient_id")
            .single();

          if (linkError || !newLink) {
            throw appError(ERR.SERVER_ERROR, {
              message: "Failed to link ingredient",
              details: { hint: linkError?.message },
            });
          }

          link = { id: newLink.id, store_ingredient_id: newLink.store_ingredient_id, preferred: true };
        }

        storeIngredientId = link.store_ingredient_id;
        linkCache.set(catalog.id, { storeIngredientId });
      }

      if (!storeIngredientId) {
        throw appError(ERR.SERVER_ERROR, {
          message: "Failed to resolve store ingredient",
        });
      }

      const qtyValue = Number(item.qty);
      const qty = Number.isFinite(qtyValue) ? Math.max(0, Math.round(qtyValue)) : 0;
      const price = Number.isFinite(item.price ?? NaN)
        ? (item.price as number)
        : catalog.purchase_price ?? 0;

      const priceInt = Math.max(0, Math.round(price));

      computedTotal += priceInt * qty;

      if (qty <= 0) {
        throw appError(ERR.BAD_REQUEST, {
          message: "Quantity must be greater than zero",
          details: { catalogItemId: catalog.id },
        });
      }

      preparedItems.push({
        catalog_item_id: catalog.id,
        supplier_id: body.supplierId,
        store_ingredient_id: storeIngredientId,
        qty,
        base_uom: catalog.base_uom,
        price: priceInt,
      });
    }

    if (preparedItems.length === 0) {
      throw appError(ERR.BAD_REQUEST, {
        message: "No valid PO items provided",
      });
    }

    const totals = {
      ...(body.totals ?? {}),
      grand_total:
        typeof body.totals?.grand_total === "number" ? body.totals.grand_total : computedTotal,
    } as Record<string, unknown>;

    const insertPayload: TablesInsert<"purchase_orders"> = {
      status: body.status,
      items: preparedItems as TablesInsert<"purchase_orders">["items"],
      totals: totals as TablesInsert<"purchase_orders">["totals"],
      issued_at: body.issuedAt ?? new Date().toISOString(),
      created_by: actor.user.id,
    };

    const { data, error } = await admin
      .from("purchase_orders")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to create purchase order",
        details: { hint: error.message },
      });
    }

    return ok({ purchaseOrder: mapPurchaseOrderRow(data as RawPurchaseOrderRow) });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
