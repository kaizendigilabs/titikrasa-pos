import { NextRequest } from "next/server";

import {
  fetchStoreIngredientDetail,
  updateStoreIngredientMeta,
} from "@/features/inventory/store-ingredients/server";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, appError, ERR } from "@/lib/utils/errors";
import { updateStoreIngredientSchema } from "@/features/inventory/store-ingredients/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireActor();
    const { id } = await params;

    if (!id) {
      throw appError(ERR.BAD_REQUEST, {
        message: "Missing ingredient id",
      });
    }

    const storeIngredient = await fetchStoreIngredientDetail(id);
    return ok({ storeIngredient });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    const { id } = await params;

    if (!id) {
      throw appError(ERR.BAD_REQUEST, {
        message: "Missing ingredient id",
      });
    }

    const payload = await request.json();
    const body = updateStoreIngredientSchema.parse(payload);
    const storeIngredient = await updateStoreIngredientMeta(actor, id, body);

    return ok({ storeIngredient });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    const { id } = await params;

    if (!id) {
      throw appError(ERR.BAD_REQUEST, {
        message: "Missing ingredient id",
      });
    }

    const admin = adminClient();

    // Check if ingredient exists
    const { data: ingredient, error: fetchError } = await admin
      .from("store_ingredients")
      .select("id, name, deleted_at")
      .eq("id", id)
      .single();

    if (fetchError || !ingredient) {
      throw appError(ERR.NOT_FOUND, {
        message: "Ingredient not found",
      });
    }

    if (ingredient.deleted_at) {
      throw appError(ERR.BAD_REQUEST, {
        message: "Ingredient already deleted",
      });
    }

    // Check if used in pending PO
    const { data: pendingPOs } = await admin
      .from("purchase_orders")
      .select("id, items")
      .eq("status", "pending");

    if (pendingPOs) {
      for (const po of pendingPOs) {
        if (po.items && Array.isArray(po.items)) {
          const hasIngredient = po.items.some(
            (item: any) => item.store_ingredient_id === id
          );
          if (hasIngredient) {
            throw appError(ERR.BAD_REQUEST, {
              message: "Tidak dapat menghapus ingredient karena ada PO pending yang menggunakannya",
            });
          }
        }
      }
    }

    // Check if used in active recipes
    const { data: recipes } = await admin
      .from("recipes")
      .select("id, menu_id, items");

    if (recipes) {
      for (const recipe of recipes) {
        if (recipe.items && Array.isArray(recipe.items)) {
          const hasIngredient = recipe.items.some(
            (item: any) => item.ingredient_id === id
          );
          if (hasIngredient) {
            throw appError(ERR.BAD_REQUEST, {
              message: "Tidak dapat menghapus ingredient karena masih digunakan di resep",
            });
          }
        }
      }
    }

    // Hard delete
    const { error: deleteError } = await admin
      .from("store_ingredients")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to delete ingredient",
        details: { hint: deleteError.message },
      });
    }

    return ok({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
