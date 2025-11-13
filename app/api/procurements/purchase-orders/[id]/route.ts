import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  updatePurchaseOrderSchema,
} from "@/features/procurements/purchase-orders/schemas";
import {
  parseGrandTotal,
  parsePurchaseOrderItems,
  type PurchaseOrderListItem,
} from "@/features/procurements/purchase-orders/types";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import type { Database, TablesUpdate } from "@/lib/types/database";

function mapPurchaseOrder(row: any): PurchaseOrderListItem {
  return {
    id: row.id,
    status: row.status,
    items: parsePurchaseOrderItems(row.items ?? []),
    totals: typeof row.totals === "object" && row.totals !== null ? row.totals : {},
    supplier_id: row.supplier_id ?? "",
    supplier_name: row.supplier_name ?? row.suppliers?.name ?? "Unknown supplier",
    grand_total: parseGrandTotal(row.totals ?? null),
    issued_at: row.issued_at ?? null,
    completed_at: row.completed_at ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

async function applyCompletionEffects(purchaseOrder: PurchaseOrderListItem) {
  const admin = adminClient();
  const now = new Date().toISOString();

  for (const item of purchaseOrder.items) {
    const { data: ingredient, error: ingredientError } = await admin
      .from("store_ingredients")
      .select("id, current_stock, avg_cost")
      .eq("id", item.storeIngredientId)
      .single();

    if (ingredientError || !ingredient) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch store ingredient",
        details: { hint: ingredientError?.message, ingredientId: item.storeIngredientId },
      });
    }

    const currentStock = Number(ingredient.current_stock ?? 0);
    const currentAvg = Number(ingredient.avg_cost ?? 0);
    const qty = Math.max(0, Math.round(item.qty));
    const nextStock = currentStock + qty;
    const newAvgCost =
      nextStock === 0
        ? currentAvg
        : Math.round(
            (currentStock * currentAvg + qty * item.price) /
              Math.max(nextStock, 1),
          );

    const { error: updateIngredientError } = await admin
      .from("store_ingredients")
      .update({
        current_stock: nextStock,
        avg_cost: newAvgCost,
      })
      .eq("id", item.storeIngredientId);

    if (updateIngredientError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to update store ingredient",
        details: { hint: updateIngredientError.message, ingredientId: item.storeIngredientId },
      });
    }

    const { error: ledgerError } = await admin.from("stock_ledger").insert({
      ingredient_id: item.storeIngredientId,
      delta_qty: qty,
      uom: item.baseUom as Database["public"]["Enums"]["base_uom"],
      reason: "po",
      ref_type: "purchase_order",
      ref_id: purchaseOrder.id,
      at: now,
    });

    if (ledgerError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to append stock ledger",
        details: { hint: ledgerError.message },
      });
    }

    await admin
      .from("ingredient_supplier_links")
      .update({
        last_purchase_price: item.price,
        last_purchased_at: now,
      })
      .eq("store_ingredient_id", item.storeIngredientId)
      .eq("catalog_item_id", item.catalogItemId);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;
    const payload = await request.json();
    const body = updatePurchaseOrderSchema.parse(payload);

    const admin = adminClient();
    const { data: existing, error: existingError } = await admin
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw appError(ERR.NOT_FOUND, {
        message: "Purchase order not found",
      });
    }

    const updates: TablesUpdate<"purchase_orders"> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.items !== undefined) {
      throw appError(ERR.BAD_REQUEST, {
        message: "Updating PO line items is not supported",
      });
    }
    if (body.totals !== undefined) {
      updates.totals = body.totals as TablesUpdate<"purchase_orders">["totals"];
    }
    if (body.issuedAt !== undefined) updates.issued_at = body.issuedAt;
    if (body.completedAt !== undefined) updates.completed_at = body.completedAt;

    const shouldComplete =
      body.status === "complete" && existing.status !== "complete";
    if (shouldComplete) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await admin
      .from("purchase_orders")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to update purchase order",
        details: { hint: error.message },
      });
    }

    const purchaseOrder = mapPurchaseOrder(data);

    if (shouldComplete) {
      await applyCompletionEffects(purchaseOrder);
    }

    return ok({ purchaseOrder });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;
    const admin = adminClient();

    const { data: existing, error: existingError } = await admin
      .from("purchase_orders")
      .select("id, status")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw appError(ERR.NOT_FOUND, {
        message: "Purchase order not found",
      });
    }

    if (existing.status === "complete") {
      throw appError(ERR.BAD_REQUEST, {
        message: "Completed purchase orders cannot be deleted",
      });
    }

    const { error: deleteError } = await admin
      .from("purchase_orders")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to delete purchase order",
        details: { hint: deleteError.message },
      });
    }

    return ok({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
