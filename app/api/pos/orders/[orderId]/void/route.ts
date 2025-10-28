import { NextRequest } from "next/server";

import { voidOrderSchema } from "@/features/orders/schemas";
import { fetchOrderById } from "@/features/orders/server";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);

    const { orderId } = await context.params;
    const existing = await fetchOrderById(actor, orderId);

    if (existing.status === "void") {
      return ok(existing);
    }

    const payload = await request.json();
    const parsed = voidOrderSchema.parse(payload);

    const { error } = await actor.supabase
      .from("orders")
      .update({
        status: "void",
        payment_status: "void",
        due_date: null,
        paid_at: null,
        customer_note: [existing.customerNote, `(void) ${parsed.reason}`]
          .filter(Boolean)
          .join("\n"),
      })
      .eq("id", orderId);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal membatalkan order",
        details: { hint: error.message },
      });
    }

    const { error: ticketError } = await actor.supabase
      .from("kds_tickets")
      .update({
        items: (existing.ticket?.items ?? []).map((item) => ({
          order_item_id: item.orderItemId,
          status: "served",
          qty: item.qty,
          updated_at: new Date().toISOString(),
          updated_by: actor.user.id,
          menu_name: item.menuName,
          variant_label: item.variantLabel ?? null,
        })),
      })
      .eq("order_id", orderId);

    if (ticketError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal memperbarui tiket KDS",
        details: { hint: ticketError.message },
      });
    }

    const refreshed = await fetchOrderById(actor, orderId);
    return ok(refreshed);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof SyntaxError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Format payload tidak valid",
        }),
      );
    }
    return fail(error);
  }
}
