import type { Database, Tables } from "@/lib/types/database";
import type { KdsTicketItem } from "@/features/orders/types";

export type KdsTicketRow = Tables<"kds_tickets"> & {
  orders: Tables<"orders"> & {
    resellers?: { id: string; name: string } | null;
  };
};

export type KdsTicketView = {
  id: string;
  orderId: string;
  orderNumber: string;
  channel: Database["public"]["Enums"]["channel"];
  paymentStatus: Database["public"]["Enums"]["payment_status"];
  status: Database["public"]["Enums"]["order_status"];
  createdAt: string;
  items: KdsTicketItem[];
  bypassServed: boolean;
};
