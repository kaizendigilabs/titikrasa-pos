import { NextRequest } from "next/server";

import { createStoreIngredientEntry, fetchStoreIngredients } from "@/features/inventory/store-ingredients/server";
import {
  createStoreIngredientSchema,
  storeIngredientFiltersSchema,
} from "@/features/inventory/store-ingredients/schemas";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
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
            stockLevel: filters.stockLevel,
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

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const payload = await request.json();
    const body = createStoreIngredientSchema.parse(payload);
    const storeIngredient = await createStoreIngredientEntry(actor, body);

    return ok({ storeIngredient });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
