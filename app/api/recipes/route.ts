import { NextRequest } from "next/server";
import { z } from "zod";

import { createRecipeSchema, recipeFiltersSchema } from "@/features/recipes/schemas";
import { createRecipe, fetchRecipes } from "@/features/recipes/server";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const listSchema = recipeFiltersSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { search, menuId, page, pageSize } = listSchema.parse(params);

    const { recipes, total, filters } = await fetchRecipes(actor.supabase, {
      search,
      menuId,
      page,
      pageSize,
    });

    return ok(
      { recipes },
      {
        meta: {
          filters: {
            search: filters.search,
            menuId: filters.menuId,
          },
          pagination: {
            page: filters.page,
            pageSize: filters.pageSize,
            total,
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
          message: "Invalid recipe filters",
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
    ensureAdminOrManager(actor.roles);

    const payload = createRecipeSchema.parse(await request.json());

    const recipe = await createRecipe(actor.supabase, {
      menuId: payload.menuId,
      version: payload.version,
      effectiveFrom: payload.effectiveFrom ?? undefined,
      items: payload.items.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        uom: item.uom,
      })),
      methodSteps: payload.methodSteps?.map((step) => ({
        stepNo: step.stepNo,
        instruction: step.instruction,
      })),
      variantOverrides: payload.variantOverrides?.map((override) => ({
        size: override.size,
        temperature: override.temperature,
        items: override.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          uom: item.uom,
        })),
      })),
    });

    return ok(
      { recipe },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Invalid recipe payload",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}
