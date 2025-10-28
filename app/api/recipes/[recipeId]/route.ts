import { NextRequest } from "next/server";
import { z } from "zod";

import { updateRecipeSchema } from "@/features/recipes/schemas";
import {
  deleteRecipe,
  fetchRecipeById,
  updateRecipe,
} from "@/features/recipes/server";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const paramsSchema = z.object({
  recipeId: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { recipeId } = paramsSchema.parse(await params);
    const recipe = await fetchRecipeById(actor.supabase, recipeId);

    if (!recipe) {
      throw ERR.NOT_FOUND;
    }

    return ok({ recipe });
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Invalid recipe identifier",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { recipeId } = paramsSchema.parse(await params);
    const payload = updateRecipeSchema.parse(await request.json());

    const recipe = await updateRecipe(actor.supabase, recipeId, {
      menuId: payload.menuId ?? undefined,
      version: payload.version ?? undefined,
      effectiveFrom: payload.effectiveFrom ?? undefined,
      items: payload.items?.map((item) => ({
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

    return ok({ recipe });
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { recipeId } = paramsSchema.parse(await params);
    await deleteRecipe(actor.supabase, recipeId);
    return ok({ success: true });
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Invalid recipe identifier",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}
