import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import {
  resellerCatalogFiltersSchema,
} from "@/features/resellers/schemas";
import type { ResellerCatalogEntry } from "@/features/resellers/types";

const MAX_SOURCE_ROWS = 500;

type CatalogAccumulator = {
  menuId: string;
  menuName: string;
  thumbnailUrl: string | null;
  totalQty: number;
  lastOrderAt: string | null;
  lastPrice: number | null;
};

function accumulateCatalog(rows: any[]): ResellerCatalogEntry[] {
  const map = new Map<string, CatalogAccumulator>();

  for (const row of rows) {
    const menuId = String(row.menu_id ?? "");
    if (!menuId) continue;
    const menu = row.menu ?? {};
    const order = row.orders ?? {};
    const qty = typeof row.qty === "number" ? row.qty : 0;
    const fallbackPrice =
      typeof menu.reseller_price === "number" ? menu.reseller_price : null;
    const unitPrice =
      typeof row.price === "number" ? row.price : fallbackPrice;

    const entry =
      map.get(menuId) ??
      {
        menuId,
        menuName: menu.name ?? "Menu",
        thumbnailUrl: menu.thumbnail_url ?? null,
        totalQty: 0,
        lastOrderAt: null,
        lastPrice: null,
      };

    entry.totalQty += qty;

    const createdAt = order.created_at ?? null;
    if (
      createdAt &&
      (!entry.lastOrderAt ||
        new Date(createdAt).getTime() > new Date(entry.lastOrderAt).getTime())
    ) {
      entry.lastOrderAt = createdAt;
      entry.lastPrice = unitPrice;
    }

    map.set(menuId, entry);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
    const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
    return bTime - aTime;
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    const { id } = await params;

    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = resellerCatalogFiltersSchema.parse(queryParams);

    const limit = Math.min(filters.pageSize, 100);
    const admin = adminClient();

    const { data, error } = await admin
      .from("order_items")
      .select(
        "menu_id, qty, price, menu:menus(name, thumbnail_url, reseller_price), orders!inner(reseller_id, channel, created_at)",
      )
      .eq("orders.reseller_id", id)
      .eq("orders.channel", "reseller")
      .order("orders(created_at)", { ascending: false })
      .limit(MAX_SOURCE_ROWS);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to load catalog entries",
        details: { hint: error.message },
      });
    }

    const grouped = accumulateCatalog(data ?? []);
    const filtered = filters.search?.trim()
      ? grouped.filter((entry) =>
          entry.menuName
            .toLowerCase()
            .includes(filters.search!.trim().toLowerCase()),
        )
      : grouped;

    const total = filtered.length;
    const offset = (filters.page - 1) * limit;
    const items = filtered.slice(offset, offset + limit);

    return ok(
      { items },
      {
        meta: {
          pagination: {
            page: filters.page,
            pageSize: limit,
            total,
          },
          filters,
        },
      },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
