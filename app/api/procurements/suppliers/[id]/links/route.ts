import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  createSupplierLinkSchema,
} from "@/features/procurements/suppliers/schemas";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;
    const payload = await request.json();
    const body = createSupplierLinkSchema.parse({ ...payload, supplierId: payload.supplierId ?? id });

    if (body.supplierId !== id) {
      throw appError(ERR.BAD_REQUEST, { message: "Supplier mismatch" });
    }

    const admin = adminClient();
    const { data: existingLink, error: existingError } = await admin
      .from("ingredient_supplier_links")
      .select("id")
      .eq("catalog_item_id", body.catalogItemId)
      .eq("store_ingredient_id", body.storeIngredientId)
      .maybeSingle();

    if (existingError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to check existing links",
        details: { hint: existingError.message },
      });
    }

    if (existingLink) {
      throw appError(ERR.BAD_REQUEST, {
        message: "This ingredient is already linked to the selected catalog item",
      });
    }

    const { data, error } = await admin
      .from("ingredient_supplier_links")
      .insert({
        catalog_item_id: body.catalogItemId,
        store_ingredient_id: body.storeIngredientId,
        preferred: body.preferred ?? false,
      })
      .select("id, catalog_item_id")
      .single();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to create supplier link",
        details: { hint: error.message },
      });
    }

    if (body.preferred) {
      await admin
        .from("ingredient_supplier_links")
        .update({ preferred: false })
        .eq("catalog_item_id", data.catalog_item_id)
        .neq("id", data.id);
    }

    return ok({ linkId: data.id });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
