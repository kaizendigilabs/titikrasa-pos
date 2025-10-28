import { parseTicketItems, parseTotals, type OrderItem, type OrderListItem, type RawOrderRow } from "./types";

function parseVariant(variant: string | null) {
  if (!variant) {
    return { size: null, temperature: null };
  }
  const [size, temperature] = variant.split("|");
  return {
    size: size || null,
    temperature: temperature || null,
  };
}

function mapOrderItem(row: RawOrderRow["order_items"][number]): OrderItem {
  const { size, temperature } = parseVariant(row.variant);
  return {
    id: row.id,
    menuId: row.menu_id,
    menuName: row.menus?.name ?? "Unknown Menu",
    menuSku: row.menus?.sku ?? null,
    thumbnailUrl: row.menus?.thumbnail_url ?? row.menus?.categories?.icon_url ?? null,
    variant: row.variant,
    size,
    temperature,
    qty: row.qty,
    price: row.price,
    discount: row.discount,
    tax: row.tax,
  };
}

export function mapOrderRow(row: RawOrderRow): OrderListItem {
  const totals = parseTotals(row.totals);
  const ticketRow = row.kds_tickets?.[0] ?? null;
  const ticket = ticketRow
    ? {
        id: ticketRow.id,
        orderId: row.id,
        items: parseTicketItems(ticketRow.items),
        createdAt: ticketRow.created_at,
      }
    : null;

  return {
    id: row.id,
    number: row.number,
    channel: row.channel,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    dueDate: row.due_date,
    totals,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    customerNote: row.customer_note,
    reseller: row.resellers ? { id: row.resellers.id, name: row.resellers.name } : null,
    items: (row.order_items ?? []).map(mapOrderItem),
    ticket,
  };
}
