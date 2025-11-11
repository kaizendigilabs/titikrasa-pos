import { appError, ERR } from "@/lib/utils/errors";
import type { ActorContext } from "@/features/users/server";
import { resellerFiltersSchema } from "./schemas";
import type {
  ResellerCatalogEntry,
  ResellerDetailBootstrap,
  ResellerListItem,
  ResellerOrder,
} from "./types";
import { parseContact, parseTerms } from "./types";

function mapRow(row: any): ResellerListItem {
  return {
    id: row.id,
    name: row.name,
    contact: parseContact(row.contact),
    terms: parseTerms(row.terms),
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export async function getResellersTableBootstrap(
  actor: ActorContext,
  options: { pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? 50;
  const filters = resellerFiltersSchema.parse({
    page: "1",
    pageSize: String(pageSize),
    status: "all",
  });

  const { data, error, count } = await actor.supabase
    .from("resellers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, filters.pageSize - 1);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load resellers",
      details: { hint: error.message },
    });
  }

  const initialResellers = (data ?? []).map(mapRow);

  return {
    initialResellers,
    initialMeta: {
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? initialResellers.length,
      },
      filters: {
        search: null as string | null,
        status: "all" as const,
      },
    },
  };
}

const MAX_CATALOG_SOURCE_ROWS = 400;

function parseTotalsGrand(totals: Record<string, unknown> | null): number {
  if (!totals || typeof totals !== "object") {
    return 0;
  }
  const raw = (totals as Record<string, unknown>).grand;
  const value = typeof raw === "string" ? Number(raw) : raw;
  return Number.isFinite(value) ? Number(value) : 0;
}

function mapOrderRow(row: any): ResellerOrder {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    dueDate: row.due_date ?? null,
    totalAmount: parseTotalsGrand(row.totals ?? null),
    createdAt: row.created_at,
    paidAt: row.paid_at ?? null,
  };
}

type CatalogAccumulator = {
  menuId: string;
  menuName: string;
  thumbnailUrl: string | null;
  totalQty: number;
  lastOrderAt: string | null;
  lastPrice: number | null;
};

function buildCatalogHighlights(rows: any[]): ResellerCatalogEntry[] {
  const map = new Map<string, CatalogAccumulator>();

  for (const row of rows) {
    const menuId = row.menu_id as string;
    if (!menuId) continue;
    const menu = row.menu ?? {};
    const order = row.orders ?? {};
    const qty = typeof row.qty === "number" ? row.qty : 0;
    const price =
      typeof row.price === "number"
        ? row.price
        : typeof menu.reseller_price === "number"
          ? menu.reseller_price
          : null;
    const entry =
      map.get(menuId) ??
      {
        menuId,
        menuName: menu.name ?? "Unlabeled menu",
        thumbnailUrl: menu.thumbnail_url ?? null,
        totalQty: 0,
        lastOrderAt: null,
        lastPrice: null,
      };
    entry.totalQty += qty;
    const orderCreated = order.created_at ?? null;
    if (
      orderCreated &&
      (!entry.lastOrderAt ||
        new Date(orderCreated).getTime() > new Date(entry.lastOrderAt).getTime())
    ) {
      entry.lastOrderAt = orderCreated;
      entry.lastPrice = price;
    }
    map.set(menuId, entry);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
    const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
    return bTime - aTime;
  });
}

export async function getResellerDetail(
  actor: ActorContext,
  resellerId: string,
): Promise<ResellerDetailBootstrap> {
  const { data: resellerRow, error: resellerError } = await actor.supabase
    .from("resellers")
    .select("*")
    .eq("id", resellerId)
    .maybeSingle();

  if (resellerError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load reseller",
      details: { hint: resellerError.message },
    });
  }

  if (!resellerRow) {
    throw appError(ERR.NOT_FOUND, { message: "Reseller not found" });
  }

  const reseller = mapRow(resellerRow);

  const { count: totalOrders = 0, error: orderCountError } = await actor.supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("channel", "reseller")
    .eq("reseller_id", resellerId);

  if (orderCountError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load reseller stats",
      details: { hint: orderCountError.message },
    });
  }

  const {
    data: unpaidRows,
    count: unpaidCount = 0,
    error: unpaidError,
  } = await actor.supabase
    .from("orders")
    .select("id, totals")
    .eq("channel", "reseller")
    .eq("reseller_id", resellerId)
    .eq("payment_status", "unpaid");

  if (unpaidError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load outstanding invoices",
      details: { hint: unpaidError.message },
    });
  }

  const totalOutstanding = (unpaidRows ?? []).reduce(
    (sum, row) => sum + parseTotalsGrand(row.totals ?? null),
    0,
  );

  const { data: recentOrdersRows, error: recentOrdersError } =
    await actor.supabase
      .from("orders")
      .select(
        "id, number, status, payment_status, payment_method, due_date, totals, created_at, paid_at",
      )
      .eq("channel", "reseller")
      .eq("reseller_id", resellerId)
      .order("created_at", { ascending: false })
      .limit(10);

  if (recentOrdersError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load transaction history",
      details: { hint: recentOrdersError.message },
    });
  }

  const recentOrders = (recentOrdersRows ?? []).map(mapOrderRow);

  const { data: catalogRows, error: catalogError } = await actor.supabase
    .from("order_items")
    .select(
      "menu_id, qty, price, menu:menus(name, thumbnail_url, reseller_price), orders!inner(reseller_id, channel, created_at)",
    )
    .eq("orders.reseller_id", resellerId)
    .eq("orders.channel", "reseller")
    .order("orders(created_at)", { ascending: false })
    .limit(MAX_CATALOG_SOURCE_ROWS);

  if (catalogError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load catalog information",
      details: { hint: catalogError.message },
    });
  }

  const catalogHighlights = buildCatalogHighlights(catalogRows ?? []).slice(0, 6);

  return {
    reseller,
    stats: {
      totalOrders,
      unpaidCount,
      totalOutstanding,
    },
    recentOrders,
    catalogHighlights,
  };
}
