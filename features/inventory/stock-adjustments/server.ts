import type { SupabaseClient } from "@supabase/supabase-js";

import { createStockAdjustmentSchema, type CreateStockAdjustmentInput } from "./schemas";
import type { StockAdjustment, StockAdjustmentItem, StockAdjustmentRow } from "./types";
import type { ActorContext } from "@/features/users/server";
import { adminClient } from "@/features/users/server";
import type { Database, Tables } from "@/lib/types/database";
import { ERR, appError } from "@/lib/utils/errors";

type AdminSupabase = SupabaseClient<Database>;

function resolveClient(client?: AdminSupabase) {
  return client ?? adminClient();
}

function normalizeItems(value: unknown): StockAdjustmentItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const ingredientId =
        "ingredient_id" in item && typeof item.ingredient_id === "string"
          ? item.ingredient_id
          : null;
      const deltaQty =
        "delta_qty" in item && typeof item.delta_qty === "number"
          ? item.delta_qty
          : typeof item.delta_qty === "string"
            ? Number.parseInt(item.delta_qty, 10)
            : null;
      const countedQty =
        "counted_qty" in item && typeof item.counted_qty === "number"
          ? item.counted_qty
          : typeof item.counted_qty === "string"
            ? Number.parseInt(item.counted_qty, 10)
            : null;
      const reason =
        "reason" in item && typeof item.reason === "string"
          ? item.reason
          : "opname";

      if (!ingredientId || deltaQty === null || countedQty === null) {
        return null;
      }

      return {
        ingredientId,
        deltaQty,
        countedQty,
        reason,
      };
    })
    .filter((item): item is StockAdjustmentItem => item !== null);
}

export function mapStockAdjustment(row: StockAdjustmentRow): StockAdjustment {
  return {
    id: row.id,
    status: row.status as StockAdjustment["status"],
    notes: row.notes ?? "",
    items: normalizeItems(row.items),
    createdBy: row.created_by ?? null,
    approvedBy: row.approved_by ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    approvedAt: row.approved_at ?? null,
  };
}

export async function createStockAdjustment(
  actor: ActorContext,
  payload: CreateStockAdjustmentInput,
  client?: AdminSupabase,
) {
  const supabase = resolveClient(client);
  const body = createStockAdjustmentSchema.parse(payload);

  const ingredientIds = Array.from(new Set(body.items.map((item) => item.ingredientId)));
  if (ingredientIds.length === 0) {
    throw appError(ERR.BAD_REQUEST, {
      message: "No ingredients provided",
    });
  }

  const { data: ingredientRows, error: ingredientError } = await supabase
    .from("store_ingredients")
    .select("*")
    .in("id", ingredientIds);

  if (ingredientError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load ingredients",
      details: { hint: ingredientError.message },
    });
  }

  const ingredientMap = new Map<string, Tables<"store_ingredients">>();
  for (const row of ingredientRows ?? []) {
    ingredientMap.set(row.id, row);
  }

  const items = body.items.map((item) => {
    const ingredient = ingredientMap.get(item.ingredientId);
    if (!ingredient) {
      throw appError(ERR.BAD_REQUEST, {
        message: "Invalid ingredient selected",
        details: { ingredientId: item.ingredientId },
      });
    }

    const countedQty = Math.max(0, Math.round(item.countedQty));
    const deltaQty = countedQty - (ingredient.current_stock ?? 0);

    return {
      ingredientId: ingredient.id,
      deltaQty,
      countedQty,
      baseUom: ingredient.base_uom,
    };
  });

  const itemsPayload = items.map((item) => ({
    ingredient_id: item.ingredientId,
    delta_qty: item.deltaQty,
    counted_qty: item.countedQty,
    reason: "opname",
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("stock_adjustments")
    .insert({
      status: "draft",
      notes: body.notes,
      items: itemsPayload,
      created_by: actor.user.id,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to create stock adjustment",
      details: { hint: insertError?.message },
    });
  }

  // Always approve immediately - no draft mode
  try {
    const { data: approvedRow, error: approveError } = await supabase
      .from("stock_adjustments")
      .update({ status: "approved", approved_by: actor.user.id })
      .eq("id", inserted.id)
      .select("*")
      .single();

    if (approveError || !approvedRow) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to approve stock adjustment",
        details: { hint: approveError?.message },
      });
    }

    return mapStockAdjustment(approvedRow);
  } catch (error) {
    // If approval fails, delete the adjustment to clean up
    await supabase.from("stock_adjustments").delete().eq("id", inserted.id);
    throw error;
  }
}

export async function approveStockAdjustment(
  actor: ActorContext,
  adjustmentId: string,
  client?: AdminSupabase,
) {
  const supabase = resolveClient(client);

  const { data: adjustmentRow, error: adjustmentError } = await supabase
    .from("stock_adjustments")
    .select("*")
    .eq("id", adjustmentId)
    .single();

  if (adjustmentError || !adjustmentRow) {
    throw appError(ERR.NOT_FOUND, {
      message: "Stock adjustment not found",
    });
  }

  if (adjustmentRow.status === "approved") {
    return mapStockAdjustment(adjustmentRow);
  }

  if (!actor.roles.isAdmin && !actor.roles.isManager) {
    throw appError(ERR.FORBIDDEN, {
      message: "Only admin or manager can approve stock adjustments",
    });
  }

  const items = normalizeItems(adjustmentRow.items);
  if (items.length === 0) {
    throw appError(ERR.BAD_REQUEST, {
      message: "Stock adjustment has no items",
    });
  }

  const ingredientIds = items.map((item) => item.ingredientId);
  const { data: ingredientRows, error: ingredientError } = await supabase
    .from("store_ingredients")
    .select("*")
    .in("id", ingredientIds);

  if (ingredientError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load ingredients",
      details: { hint: ingredientError.message },
    });
  }

  const ingredientMap = new Map<string, Tables<"store_ingredients">>();
  for (const row of ingredientRows ?? []) {
    ingredientMap.set(row.id, row);
  }

  try {
    const { data: approvedRow, error: approveError } = await supabase
      .from("stock_adjustments")
      .update({ status: "approved", approved_by: actor.user.id })
      .eq("id", adjustmentRow.id)
      .select("*")
      .single();

    if (approveError || !approvedRow) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to approve stock adjustment",
        details: { hint: approveError?.message },
      });
    }

    return mapStockAdjustment(approvedRow);
  } catch (error) {
    throw error;
  }
}
