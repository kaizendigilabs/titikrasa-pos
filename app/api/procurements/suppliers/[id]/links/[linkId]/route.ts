import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import { updateSupplierLinkSchema } from "@/features/procurements/suppliers/model/forms/schema";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";

async function ensureLinkBelongsToSupplier(linkId: string, supplierId: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("ingredient_supplier_links")
    .select(
      "id, catalog_item_id, supplier_catalog_items!inner(supplier_id)"
    )
    .eq("id", linkId)
    .eq("supplier_catalog_items.supplier_id", supplierId)
    .single();

  if (error || !data) {
    throw appError(ERR.NOT_FOUND, { message: "Supplier link not found" });
  }

  return data as { id: string; catalog_item_id: string };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id, linkId } = await params;
    const payload = await request.json();
    const body = updateSupplierLinkSchema.parse(payload);

    const link = await ensureLinkBelongsToSupplier(linkId, id);

    const admin = adminClient();
    const { error: updateError } = await admin
      .from("ingredient_supplier_links")
      .update({ preferred: body.preferred })
      .eq("id", linkId);

    if (updateError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to update supplier link",
        details: { hint: updateError.message },
      });
    }

    if (body.preferred) {
      await admin
        .from("ingredient_supplier_links")
        .update({ preferred: false })
        .eq("catalog_item_id", link.catalog_item_id)
        .neq("id", linkId);
    }

    return ok({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id, linkId } = await params;
    await ensureLinkBelongsToSupplier(linkId, id);

    const admin = adminClient();
    const { error } = await admin
      .from("ingredient_supplier_links")
      .delete()
      .eq("id", linkId);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to delete supplier link",
        details: { hint: error.message },
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
