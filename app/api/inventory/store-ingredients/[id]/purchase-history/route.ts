import { NextRequest } from "next/server";

import { fetchPurchaseHistory } from "@/features/inventory/store-ingredients/server";
import { purchaseHistoryFiltersSchema } from "@/features/inventory/store-ingredients/model/forms/schema";
import { requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, appError, ERR } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireActor();
    const { id } = await params;

    if (!id) {
      throw appError(ERR.BAD_REQUEST, { message: "Missing ingredient id" });
    }

    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    if (queryParams.format === "csv") {
      throw appError(ERR.BAD_REQUEST, {
        message: "Purchase history export is not yet available",
      });
    }

    const filters = purchaseHistoryFiltersSchema.parse(queryParams);
    const result = await fetchPurchaseHistory(id, filters);

    return ok(
      { purchases: result.items },
      {
        meta: {
          pagination: {
            page: filters.page,
            pageSize: result.limit,
            total: result.total,
          },
          filters: {
            supplierId: filters.supplierId ?? null,
            from: filters.from ?? null,
            to: filters.to ?? null,
          },
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
