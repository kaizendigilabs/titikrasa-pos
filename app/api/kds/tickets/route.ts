import { mapKdsTicketRow } from "@/features/kds/mappers";
import type { KdsTicketRow } from "@/features/kds/types";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);

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
      .order("created_at", { ascending: true });

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal memuat tiket KDS",
        details: { hint: error.message },
      });
    }

    const tickets = (data as KdsTicketRow[] | null)?.map(mapKdsTicketRow) ?? [];

    return ok({ tickets });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
