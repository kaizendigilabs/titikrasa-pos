import { parseTicketItems } from "@/features/orders/types";
import type { KdsTicketRow, KdsTicketView } from "./types";

export function mapKdsTicketRow(row: KdsTicketRow): KdsTicketView {
  const items = parseTicketItems(row.items);
  const bypassServed = items.every((item) => item.status === "served");

  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.orders.number,
    channel: row.orders.channel,
    paymentStatus: row.orders.payment_status,
    status: row.orders.status,
    createdAt: row.created_at,
    items,
    bypassServed,
  };
}
