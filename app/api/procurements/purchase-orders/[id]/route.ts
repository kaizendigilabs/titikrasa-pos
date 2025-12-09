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
import type { TablesUpdate } from "@/lib/types/database";

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

    // Set completed_at when status changes to complete
    if (body.status === "complete" && existing.status !== "complete") {
      updates.completed_at = new Date().toISOString();
    }

    // Clear completed_at when status changes from complete to draft/pending (reversal)
    if (existing.status === "complete" && body.status && body.status !== "complete") {
      updates.completed_at = null;
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
