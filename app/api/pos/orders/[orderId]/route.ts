import { NextRequest } from "next/server";
import { z } from "zod";

import {
  updateOrderPaymentSchema,
} from "@/features/orders/schemas";
import { fetchOrderById } from "@/features/orders/server";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);
    const { orderId } = await context.params;
    const order = await fetchOrderById(actor, orderId);
    return ok(order);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);
    const { orderId } = await context.params;

    const existing = await fetchOrderById(actor, orderId);

    const payload = await request.json();
    const parsed = updateOrderPaymentSchema.parse(payload);

    if (parsed.paymentStatus === "void") {
      throw appError(ERR.BAD_REQUEST, {
        message: "Gunakan endpoint void untuk membatalkan order",
      });
    }

    if (existing.channel === "pos" && parsed.dueDate) {
      throw appError(ERR.BAD_REQUEST, {
        message: "Order POS tidak memiliki due date",
      });
    }

    const updates: Record<string, unknown> = {};

    if (parsed.paymentMethod) {
      updates.payment_method = parsed.paymentMethod;
    }

    if (parsed.paymentStatus) {
      updates.payment_status = parsed.paymentStatus;
      updates.status = parsed.paymentStatus === "paid" ? "paid" : "open";
      updates.paid_at = parsed.paymentStatus === "paid"
        ? parsed.paidAt ?? new Date().toISOString()
        : null;
    }

    if (parsed.dueDate !== undefined) {
      updates.due_date = parsed.dueDate;
    }

    if (Object.keys(updates).length === 0) {
      return ok(existing);
    }

    const { error } = await actor.supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal memperbarui pembayaran order",
        details: { hint: error.message },
      });
    }

    const refreshed = await fetchOrderById(actor, orderId);
    return ok(refreshed);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Input pembaruan pembayaran tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);

    const { orderId } = await context.params;
    const existing = await fetchOrderById(actor, orderId);

    if (existing.paymentStatus === "paid") {
      throw appError(ERR.BAD_REQUEST, {
        message: "Order yang sudah lunas tidak dapat dihapus",
      });
    }


    const { error: deleteItemsError } = await actor.supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (deleteItemsError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal menghapus item order",
        details: { hint: deleteItemsError.message },
      });
    }

    const { error: deleteOrderError } = await actor.supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (deleteOrderError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal menghapus order",
        details: { hint: deleteOrderError.message },
      });
    }

    return ok({ success: true, deleted: existing.id });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
