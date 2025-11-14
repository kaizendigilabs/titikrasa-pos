import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";

import { createOrderSchema } from "@/features/orders/schemas";
import { mapOrderRow } from "@/features/orders/mappers";
import {
  buildOrderNumber,
  buildTicketItems,
  computeOrderTotals,
} from "@/features/orders/utils";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import { fetchOrderById, ORDER_SELECT } from "@/features/orders/server";
import type { RawOrderRow } from "@/features/orders/types";
import type { Database, Json } from "@/lib/types/database";

const listSchema = z.object({
  channel: z.enum(["pos", "reseller", "all"] as const).default("pos"),
  status: z.enum(["open", "paid", "void", "refunded", "all"] as const).default("open"),
  paymentStatus: z.enum(["paid", "unpaid", "void", "all"] as const).default("all"),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { channel, status, paymentStatus, search, limit } = listSchema.parse(params);

    let query = actor.supabase
      .from("orders")
      .select(
        `
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
        kds_tickets (
          id,
          items,
          created_at
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (channel !== "all") {
      query = query.eq("channel", channel);
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (paymentStatus !== "all") {
      query = query.eq("payment_status", paymentStatus);
    }

    if (search) {
      const pattern = `%${search}%`;
      query = query.ilike("number", pattern);
    }

    const { data, error } = await query;
    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal memuat order",
        details: { hint: error.message },
      });
    }

    const items = (data as RawOrderRow[] | null)?.map(mapOrderRow) ?? [];

    return ok(
      { items },
      {
        meta: {
          filters: { channel, status, paymentStatus, search: search ?? null },
          pagination: {
            page: 1,
            pageSize: items.length,
            total: items.length,
          },
        },
      },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Parameter pencarian tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);

    const payload = await request.json();
    if (payload && typeof payload === "object" && payload.client_id && !payload.clientId) {
      payload.clientId = payload.client_id;
    }
    const parsed = createOrderSchema.parse(payload);

    if (parsed.clientId) {
      const existing = await findOrderByClientRef(actor.supabase, parsed.clientId);
      if (existing) {
        return ok(existing);
      }
    }

    const itemsWithId = parsed.items.map((item) => ({
      ...item,
      id: item.id ?? randomUUID(),
    }));

    const totals = computeOrderTotals(itemsWithId, parsed.discount, parsed.taxRate);

    const orderId = randomUUID();
    const orderNumber = buildOrderNumber();

    const paidAt = parsed.paymentStatus === "paid" ? new Date().toISOString() : null;
    const status = parsed.paymentStatus === "paid" ? "paid" : "open";

    let dueDate: string | null = null;
    if (parsed.channel === "reseller" && parsed.paymentStatus === "unpaid") {
      if (parsed.dueDate) {
        dueDate = parsed.dueDate;
      } else {
        const suggested = new Date();
        suggested.setDate(suggested.getDate() + 7);
        dueDate = suggested.toISOString().slice(0, 10);
      }
    }

    const ticketItems = buildTicketItems(itemsWithId, parsed.bypassServed, actor.user.id).map((item) => ({
      order_item_id: item.orderItemId,
      status: item.status,
      qty: item.qty,
      updated_at: item.updatedAt,
      updated_by: item.updatedBy,
      menu_name: item.menuName,
      variant_label: item.variantLabel ?? null,
    }));

    const orderItemsPayload = itemsWithId.map((item) => ({
      id: item.id,
      menu_id: item.menuId,
      qty: item.qty,
      price: item.unitPrice,
      discount: item.discount ?? 0,
      tax: item.tax ?? 0,
      variant: item.variant ?? null,
    }));

    const checkoutPayload = {
      order_id: orderId,
      number: orderNumber,
      channel: parsed.channel,
      reseller_id: parsed.resellerId,
      payment_method: parsed.paymentMethod,
      payment_status: parsed.paymentStatus,
      status,
      due_date: dueDate,
      customer_note: parsed.note ?? null,
      totals,
      paid_at: paidAt,
      created_by: actor.user.id,
      items: orderItemsPayload,
      ticket_items: ticketItems,
      client_ref: parsed.clientId ?? null,
    };

    const { error: checkoutError } = await actor.supabase.rpc("pos_checkout", {
      payload: checkoutPayload,
    });

    if (checkoutError) {
      if (isCheckoutFunctionMissing(checkoutError)) {
        await manualCheckout(actor.supabase, checkoutPayload, orderItemsPayload, ticketItems);
      } else {
        throw appError(ERR.SERVER_ERROR, {
          message: "Gagal menyelesaikan transaksi",
          details: { hint: checkoutError.message },
        });
      }
    }

    const created = await fetchOrderById(actor, orderId);
    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Input order tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}

async function findOrderByClientRef(
  supabase: Awaited<ReturnType<typeof requireActor>>["supabase"],
  clientRef: string,
) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("client_ref", clientRef)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal memeriksa duplikasi order POS",
      details: { hint: error.message },
    });
  }

  if (!data) {
    return null;
  }
  return mapOrderRow(data as RawOrderRow);
}

function isCheckoutFunctionMissing(error: PostgrestError) {
  if (!error) return false;
  if (error.code === "42883") return true;
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
  return message.includes("pos_checkout");
}

async function manualCheckout(
  supabase: Awaited<ReturnType<typeof requireActor>>["supabase"],
  checkoutPayload: {
    order_id: string;
    number: string;
    channel: string;
    reseller_id: string | null;
    payment_method: string;
    payment_status: string;
    status: string;
    due_date: string | null;
    customer_note: string | null;
    totals: Record<string, unknown>;
    paid_at: string | null;
    created_by: string;
    client_ref: string | null;
    items: Array<{
      id: string;
      menu_id: string;
      qty: number;
      price: number;
      discount: number;
      tax: number;
      variant: string | null;
    }>;
    ticket_items: Array<Record<string, unknown>>;
  },
  orderItemsPayload: Array<{
    id: string;
    menu_id: string;
    qty: number;
    price: number;
    discount: number;
    tax: number;
    variant: string | null;
  }>,
  ticketItems: Array<Record<string, unknown>>,
) {
  const orderInsert: Database["public"]["Tables"]["orders"]["Insert"] = {
    id: checkoutPayload.order_id,
    number: checkoutPayload.number,
    channel: checkoutPayload.channel as Database["public"]["Enums"]["channel"],
    reseller_id: checkoutPayload.reseller_id,
    payment_method: checkoutPayload.payment_method as Database["public"]["Enums"]["payment_method"],
    payment_status: checkoutPayload.payment_status as Database["public"]["Enums"]["payment_status"],
    status: checkoutPayload.status as Database["public"]["Enums"]["order_status"],
    due_date: checkoutPayload.due_date,
    customer_note: checkoutPayload.customer_note,
    totals: checkoutPayload.totals as Json,
    paid_at: checkoutPayload.paid_at,
    created_by: checkoutPayload.created_by,
    client_ref: checkoutPayload.client_ref,
  };

  const { error: orderError } = await supabase.from("orders").insert(orderInsert);
  if (orderError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal membuat order",
      details: { hint: orderError.message },
    });
  }

  const orderItemsWithOrderId: Database["public"]["Tables"]["order_items"]["Insert"][] = orderItemsPayload.map(
    (item) => ({
      id: item.id,
      order_id: checkoutPayload.order_id,
      menu_id: item.menu_id,
      qty: item.qty,
      price: item.price,
      discount: item.discount,
      tax: item.tax,
      variant: item.variant,
    }),
  );

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsWithOrderId);
  if (itemsError) {
    await cleanupOrder(supabase, checkoutPayload.order_id);
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal menambahkan item order",
      details: { hint: itemsError.message },
    });
  }

  if (ticketItems.length > 0) {
    const { error: ticketError } = await supabase
      .from("kds_tickets")
      .insert({ order_id: checkoutPayload.order_id, items: ticketItems as Json });
    if (ticketError) {
      await cleanupOrder(supabase, checkoutPayload.order_id);
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal membuat tiket KDS",
        details: { hint: ticketError.message },
      });
    }
  }
}

async function cleanupOrder(
  supabase: Awaited<ReturnType<typeof requireActor>>["supabase"],
  orderId: string,
) {
  await supabase.from("order_items").delete().eq("order_id", orderId);
  await supabase.from("kds_tickets").delete().eq("order_id", orderId);
  await supabase.from("orders").delete().eq("id", orderId);
}
