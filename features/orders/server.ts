import { mapOrderRow } from "./mappers";
import type { RawOrderRow } from "./types";
import type { ActorContext } from "@/features/users/server";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const ORDER_SELECT = `
  id,
  number,
  channel,
  payment_method,
  payment_status,
  status,
  totals,
  due_date,
  customer_note,
  created_at,
  paid_at,
  reseller_id,
  resellers ( id, name ),
  order_items (
    id,
    menu_id,
    qty,
    price,
    discount,
    tax,
    variant,
    menus (
      id,
      name,
      sku,
      thumbnail_url,
      variants,
      category_id,
      categories ( icon_url )
    )
  ),
  kds_tickets ( id, items, created_at )
`;

export async function fetchOrderById(
  actor: ActorContext,
  orderId: string,
) {
  const { data, error } = await actor.supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal memuat order",
      details: { hint: error.message, orderId },
    });
  }

  if (!data) {
    throw appError(ERR.NOT_FOUND, {
      message: "Order tidak ditemukan",
    });
  }

  return mapOrderRow(data as RawOrderRow);
}

export async function assertOrderExists(actor: ActorContext, orderId: string) {
  try {
    return await fetchOrderById(actor, orderId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === ERR.NOT_FOUND.statusCode) {
      throw error;
    }
    throw error;
  }
}

export { ORDER_SELECT };
