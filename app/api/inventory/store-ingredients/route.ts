import { NextRequest } from "next/server";

import { fetchStoreIngredients } from "@/features/inventory/store-ingredients/server";
import { storeIngredientFiltersSchema } from "@/features/inventory/store-ingredients/schemas";
import { requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    await requireActor();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = storeIngredientFiltersSchema.parse(params);
    const result = await fetchStoreIngredients(filters);

    return ok(
      { storeIngredients: result.items },
      {
        meta: {
          pagination: {
            page: filters.page,
            pageSize: result.limit,
            total: result.total,
          },
          filters: {
            status: filters.status,
            search: filters.search ?? null,
            lowStockOnly: Boolean(filters.lowStockOnly),
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
