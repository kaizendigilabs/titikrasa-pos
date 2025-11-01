import { NextRequest } from "next/server";

import {
  fetchStoreIngredientDetail,
  updateStoreIngredientMeta,
} from "@/features/inventory/store-ingredients/server";
import { requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, appError, ERR } from "@/lib/utils/errors";
import { updateStoreIngredientSchema } from "@/features/inventory/store-ingredients/model/forms/schema";

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
