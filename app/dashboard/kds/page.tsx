import { redirect } from "next/navigation";

import { KdsScreen } from "./KdsScreen";
import { mapKdsTicketRow } from "@/features/kds/mappers";
import type { KdsTicketRow } from "@/features/kds/types";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function KdsPage() {
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
      throw error;
    }

    const tickets = (data as KdsTicketRow[] | null)?.map(mapKdsTicketRow) ?? [];

    return <KdsScreen initialTickets={tickets} />;
  } catch (error) {
    if (
      error instanceof AppError &&
      error.statusCode === ERR.FORBIDDEN.statusCode
    ) {
      redirect(
        "/dashboard?status=forbidden&message=Anda%20tidak%20memiliki%20akses%20ke%20KDS",
      );
    }
    redirect("/dashboard");
  }
}
