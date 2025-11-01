import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import { updateSupplierSchema } from "@/features/procurements/suppliers/model/forms/schema";
import { mapSupplierRow } from "@/features/procurements/suppliers/data/dto";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;
    const payload = await request.json();
    const body = updateSupplierSchema.parse(payload);

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.contact !== undefined) updates.contact = body.contact;
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    if (!Object.keys(updates).length) {
      throw appError(ERR.BAD_REQUEST, { message: "No changes provided" });
    }

    const admin = adminClient();
    const { data, error } = await admin
      .from("suppliers")
      .update(updates)
      .eq("id", id)
      .select("*, supplier_catalog_items(count)")
      .single();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to update supplier",
        details: { hint: error.message },
      });
    }

    return ok({ supplier: mapSupplierRow(data) });
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

    const admin = adminClient();
    const { error } = await admin.from("suppliers").delete().eq("id", id);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to delete supplier",
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
