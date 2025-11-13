import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  aggregateSupplierPurchaseOrders,
  normalizePurchaseOrderEntries,
} from "@/features/procurements/suppliers/server";
import {
  supplierOrderFiltersSchema,
} from "@/features/procurements/suppliers/schemas";
import {
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;

    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = supplierOrderFiltersSchema.parse(queryParams);

    const { data, error } = await actor.supabase
      .from("purchase_order_item_entries")
      .select(
        "purchase_order_id, status, issued_at, completed_at, qty, price",
      )
      .eq("supplier_id", id)
      .order("issued_at", { ascending: false })
      .limit(600);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to load purchase orders",
        details: { hint: error.message },
      });
    }

    const normalizedEntries = normalizePurchaseOrderEntries(data ?? []);

    let orders = aggregateSupplierPurchaseOrders(normalizedEntries).orders;

    if (filters.status !== "all") {
      orders = orders.filter(
        (order) => order.status?.toLowerCase() === filters.status,
      );
    }

    if (filters.search?.trim()) {
      const keyword = filters.search.trim().toLowerCase();
      orders = orders.filter((order) =>
        order.id.toLowerCase().includes(keyword),
      );
    }

    const limit = Math.min(filters.pageSize, 200);
    const start = (filters.page - 1) * limit;
    const paginated = orders.slice(start, start + limit);

    return ok(
      { items: paginated },
      {
        meta: {
          pagination: {
            page: filters.page,
            pageSize: limit,
            total: orders.length,
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
