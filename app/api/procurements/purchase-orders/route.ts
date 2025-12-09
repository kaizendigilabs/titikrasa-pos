import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  createPurchaseOrderSchema,
  purchaseOrderFiltersSchema,
} from "@/features/procurements/purchase-orders/schemas";
import {
  parseGrandTotal,
  parsePurchaseOrderItems,
  type PurchaseOrderListItem,
  type PurchaseOrderRow,
} from "@/features/procurements/purchase-orders/types";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import type { TablesInsert } from "@/lib/types/database";

const MAX_PAGE_SIZE = 200;

function getSupplierName(row: any): string {
  const supplierData = row.suppliers;
  if (Array.isArray(supplierData)) {
    return supplierData[0]?.name ?? "Unknown supplier";
  }
  if (supplierData && typeof supplierData === "object") {
    return supplierData.name ?? "Unknown supplier";
  }
  return row.supplier_name ?? "Unknown supplier";
}

function mapPurchaseOrder(row: any): PurchaseOrderListItem {
  return {
    id: row.id,
    status: row.status,
    items: parsePurchaseOrderItems(row.items ?? []),
    totals: typeof row.totals === "object" && row.totals !== null ? row.totals : {},
    supplier_id: row.supplier_id ?? "",
    supplier_name: getSupplierName(row),
    grand_total: parseGrandTotal(row.totals ?? null),
    issued_at: row.issued_at ?? null,
    completed_at: row.completed_at ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

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
      .select("*, suppliers(name)", { count: "exact" })
      .order("issued_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (filters.status !== "all") {
      query = query.eq("status", filters.status as PurchaseOrderRow["status"]);
    }

    if (filters.supplierId) {
      query = query.eq("supplier_id", filters.supplierId);
    }

    if (filters.issuedFrom) {
      query = query.gte("issued_at", filters.issuedFrom);
    }

    if (filters.issuedTo) {
      query = query.lte("issued_at", filters.issuedTo);
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

    const purchaseOrders = (data ?? []).map(mapPurchaseOrder);

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
            supplierId: filters.supplierId ?? null,
            issuedFrom: filters.issuedFrom ?? null,
            issuedTo: filters.issuedTo ?? null,
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
      const { data: rawCatalog, error: catalogError } = await admin
        .from("supplier_catalog_items")
        .select(
          "id, supplier_id, name, base_uom, purchase_price, unit_label, conversion_rate, ingredient_supplier_links ( id, store_ingredient_id, preferred )",
        )
        .eq("id", item.catalogItemId)
        .single();

      // Cast to any because database types are not yet regenerated with new columns
      const catalog = rawCatalog as any;

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

      const qtyPack = Number(item.qty); // User inputs pack quantity
      if (qtyPack <= 0) {
        throw appError(ERR.BAD_REQUEST, {
          message: "Quantity must be greater than zero",
          details: { catalogItemId: catalog.id },
        });
      }

      const conversionRate = Number(catalog.conversion_rate ?? 1);
      const qtyBase = qtyPack * conversionRate;
      const unitLabel = catalog.unit_label ?? "pcs";

      // Price logic: item.price is per pack (from user input or catalog default)
      const pricePerPack = Number.isFinite(item.price ?? NaN)
        ? (item.price as number)
        : catalog.purchase_price ?? 0;

      const pricePerPackInt = Math.max(0, Math.round(pricePerPack));

      computedTotal += pricePerPackInt * qtyPack;

      // We push the enriched structure.
      // Note: We map 'price' to pricePerPackInt because that is what the user expects in the PO Order view (Price/Unit).
      // 'qty' is mapped to qtyBase for Inventory/Logic purposes, but we also save qty_pack for UI display if needed.
      // However, to keep standard consistency with existing types that expect 'qty' and 'price' to match:
      // If we store qty=qtyBase, then price should be pricePerBase?
      // Wait, let's look at the migration notes:
      // items: [{catalog_item_id, store_ingredient_id, qty_pack, pack_uom, qty_base, price}]
      // The previous code stored 'price' and 'qty'.
      // If I want to support "Easy PO", the PO document usually shows "Beans 5 kg @ 100.000 = 500.000".
      // So 'qty' in the JSON should probably be 'qty_pack' for display purposes?
      // BUT 'applyCompletionEffects' uses 'item.qty' to add to stock.
      // If 'item.qty' is used for stock, it MUST be BASE units (gr).
      // If 'item.price' is used for avg_cost calc:
      // Math.round((currentStock * currentAvg + qty * item.price) / ...
      // Here 'qty' is Base Qty (gr). So 'item.price' MUST BE Price Per Base Unit (Price/gr).
      // So checks: 5kg * 100.000/kg = 500.000.
      // 5000gr. Price/gr = 100.000 / 1000 = 100.
      // 5000 * 100 = 500.000. Correct.
      // SO:
      // 1. We must store 'qty': qtyBase (for inventory logic compatibility)
      // 2. We must store 'price': pricePerBase (for avg cost logic compatibility)
      // 3. BUT we also want to store 'qty_pack' and 'price_pack' for UI display.
      
      const pricePerBase = pricePerPackInt / conversionRate;

      // Update preparedItems to allow extra fields (TS ignore or cast as any since items is jsonb)
      (preparedItems as any[]).push({
        catalog_item_id: catalog.id,
        supplier_id: body.supplierId,
        store_ingredient_id: storeIngredientId,
        
        // Critical for Inventory Logic (Inventory expects Base Units)
        qty: qtyBase, 
        price: pricePerBase, 
        base_uom: catalog.base_uom,

        // Display / User History (What they actually ordered)
        qty_pack: qtyPack,
        pack_uom: unitLabel,
        price_pack: pricePerPackInt,
        conversion_rate: conversionRate
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
      supplier_id: body.supplierId,
      items: preparedItems as TablesInsert<"purchase_orders">["items"],
      totals: totals as TablesInsert<"purchase_orders">["totals"],
      issued_at: body.issuedAt ?? new Date().toISOString(),
      created_by: actor.user.id,
      // Set completed_at if status is directly complete
      ...(body.status === "complete" ? { completed_at: new Date().toISOString() } : {}),
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

    const { data: enrichedRow, error: fetchError } = await admin
      .from("purchase_orders")
      .select("*, suppliers(name)")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchError || !enrichedRow) {
      console.error("[PO_FETCH_AFTER_INSERT_ERROR]", fetchError);
    }

    return ok({ purchaseOrder: mapPurchaseOrder(enrichedRow ?? data) });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
