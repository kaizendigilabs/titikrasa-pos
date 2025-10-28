import { NextRequest } from "next/server";

import { updateTicketItemSchema } from "@/features/orders/schemas";
import { mapKdsTicketRow } from "@/features/kds/mappers";
import type { KdsTicketRow } from "@/features/kds/types";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import type { Json } from "@/lib/types/database";

type RouteContext = {
  params: Promise<{ ticketId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);

    const payload = await request.json();
    const parsed = updateTicketItemSchema.parse(payload);
    const { ticketId } = await context.params;

    const { data, error } = await actor.supabase
      .from("kds_tickets")
      .select(
        `
        id,
        order_id,
        items,
        created_at,
        orders (
          id,
          number,
          channel,
          payment_status,
          status
        )
      `,
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal memuat tiket",
        details: { hint: error.message },
      });
    }

    if (!data) {
      throw appError(ERR.NOT_FOUND, {
        message: "Ticket tidak ditemukan",
      });
    }

    const rawItems = Array.isArray(data.items)
      ? (data.items as Record<string, unknown>[])
      : [];
    const updatedAt = new Date().toISOString();
    let matched = false;

    const nextItems = rawItems.map((item) => {
      if (!item || typeof item !== "object") return item;
      const record = item as Record<string, unknown>;
      if (record.order_item_id === parsed.orderItemId) {
        matched = true;
        return {
          ...record,
          status: parsed.status,
          updated_at: updatedAt,
          updated_by: actor.user.id,
        };
      }
      return item;
    });

    if (!matched) {
      throw appError(ERR.BAD_REQUEST, {
        message: "Item pada tiket tidak ditemukan",
      });
    }

    const { error: updateError } = await actor.supabase
      .from("kds_tickets")
      .update({ items: nextItems as unknown as Json })
      .eq("id", ticketId);

    if (updateError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal memperbarui status tiket",
        details: { hint: updateError.message },
      });
    }

    const updatedTicket = await actor.supabase
      .from("kds_tickets")
      .select(
        `
        id,
        order_id,
        items,
        created_at,
        orders (
          id,
          number,
          channel,
          payment_status,
          status
        )
      `,
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (updatedTicket.error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal mengambil tiket setelah update",
        details: { hint: updatedTicket.error.message },
      });
    }

    if (!updatedTicket.data) {
      throw appError(ERR.NOT_FOUND, {
        message: "Ticket tidak ditemukan setelah update",
      });
    }

    const view = mapKdsTicketRow(updatedTicket.data as KdsTicketRow);

    if (
      view.items.length > 0 &&
      view.items.every((item) => item.status === "served") &&
      view.paymentStatus === "paid" &&
      view.status !== "paid"
    ) {
      await actor.supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", view.orderId);
    }

    return ok(view);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof SyntaxError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Payload tidak valid",
        }),
      );
    }
    return fail(error);
  }
}
