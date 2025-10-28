import type { Json, Tables, Database } from "@/lib/types/database";

export type OrderChannel = Database["public"]["Enums"]["channel"];
export type OrderPaymentMethod = Database["public"]["Enums"]["payment_method"];
export type OrderPaymentStatus = Database["public"]["Enums"]["payment_status"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];

export type OrderTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  grand: number;
};

export type OrderListItem = {
  id: string;
  number: string;
  channel: OrderChannel;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  status: OrderStatus;
  dueDate: string | null;
  totals: OrderTotals;
  createdAt: string;
  paidAt: string | null;
  customerNote: string | null;
  reseller: { id: string; name: string } | null;
  items: OrderItem[];
  ticket: KdsTicket | null;
};

export type OrderItem = {
  id: string;
  menuId: string;
  menuName: string;
  menuSku: string | null;
  thumbnailUrl: string | null;
  variant: string | null;
  size: string | null;
  temperature: string | null;
  qty: number;
  price: number;
  discount: number;
  tax: number;
};

export type OrderFilters = {
  channel?: OrderChannel | "all";
  status?: OrderStatus | "all";
  paymentStatus?: OrderPaymentStatus | "all";
  search?: string | null;
  limit?: number;
};

export type KdsTicketItem = {
  orderItemId: string;
  status: "queue" | "making" | "ready" | "served";
  qty: number;
  updatedAt: string;
  updatedBy: string | null;
  menuName?: string;
  variantLabel?: string | null;
};

export type KdsTicket = {
  id: string;
  orderId: string;
  items: KdsTicketItem[];
  createdAt: string;
};

export type RawOrderRow = Tables<"orders"> & {
  resellers?: { id: string; name: string } | null;
  order_items: Array<
    Tables<"order_items"> & {
      menus?: (Tables<"menus"> & { categories?: { icon_url: string | null } | null }) | null;
    }
  >;
  kds_tickets: Array<Tables<"kds_tickets">>;
};

export function parseTotals(value: Json | null): OrderTotals {
  if (!value || typeof value !== "object") {
    return { subtotal: 0, discount: 0, tax: 0, grand: 0 };
  }
  const record = value as Record<string, unknown>;
  const subtotal = Number(record.subtotal) || 0;
  const discount = Number(record.discount) || 0;
  const tax = Number(record.tax) || 0;
  const grand = Number(record.grand) || 0;
  return { subtotal, discount, tax, grand };
}

export function parseTicketItems(value: Json | null): KdsTicketItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: KdsTicketItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const orderItemId = typeof record.order_item_id === "string" ? record.order_item_id : null;
    const status =
      typeof record.status === "string" &&
      ["queue", "making", "ready", "served"].includes(record.status)
        ? (record.status as KdsTicketItem["status"])
        : null;
    if (!orderItemId || !status) continue;
    result.push({
      orderItemId,
      status,
      qty: typeof record.qty === "number" ? record.qty : 1,
      updatedAt:
        typeof record.updated_at === "string"
          ? record.updated_at
          : new Date().toISOString(),
      updatedBy:
        typeof record.updated_by === "string" ? record.updated_by : null,
      menuName: typeof record.menu_name === "string" ? record.menu_name : undefined,
      variantLabel:
        typeof record.variant_label === "string"
          ? record.variant_label
          : null,
    });
  }

  return result;
}
