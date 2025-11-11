import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import {
  resellerOrderFiltersSchema,
} from "@/features/resellers/schemas";
import type { ResellerOrder } from "@/features/resellers/types";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    const { id } = await params;

    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = resellerOrderFiltersSchema.parse(queryParams);

    const limit = Math.min(filters.pageSize, 200);
    const from = (filters.page - 1) * limit;
    const to = from + limit - 1;

    let query = actor.supabase
      .from("orders")
      .select(
        "id, number, status, payment_status, payment_method, due_date, totals, created_at, paid_at",
        { count: "exact" },
      )
      .eq("channel", "reseller")
      .eq("reseller_id", id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.paymentStatus !== "all") {
      query = query.eq("payment_status", filters.paymentStatus);
    }

    if (filters.search?.trim()) {
      query = query.ilike("number", `%${filters.search.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch reseller orders",
        details: { hint: error.message },
      });
    }

    const items = (data ?? []).map(mapOrderRow);

    return ok(
      { items },
      {
        meta: {
          pagination: {
            page: filters.page,
            pageSize: limit,
            total: count ?? items.length,
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
