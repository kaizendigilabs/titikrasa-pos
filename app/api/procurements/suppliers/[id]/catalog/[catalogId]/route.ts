import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  updateCatalogItemSchema,
} from "@/features/procurements/suppliers/schemas";
import {
  type SupplierCatalogItem,
} from "@/features/procurements/suppliers/types";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import type { TablesUpdate } from "@/lib/types/database";

function mapCatalogItem(row: any): SupplierCatalogItem {
  return {
    id: row.id,
    supplier_id: row.supplier_id,
    name: row.name,
    base_uom: row.base_uom,
    purchase_price: row.purchase_price,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; catalogId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id, catalogId } = await params;
    const payload = await request.json();
    const body = updateCatalogItemSchema.parse(payload);

    const updates: TablesUpdate<"supplier_catalog_items"> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.baseUom !== undefined) updates.base_uom = body.baseUom;
    if (body.purchasePrice !== undefined) updates.purchase_price = body.purchasePrice;
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    if (!Object.keys(updates).length) {
      throw appError(ERR.BAD_REQUEST, { message: "No changes provided" });
    }

    const admin = adminClient();
    const { data, error } = await admin
      .from("supplier_catalog_items")
      .update(updates)
      .eq("id", catalogId)
      .eq("supplier_id", id)
      .select("*")
      .single();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to update catalog item",
        details: { hint: error.message },
      });
    }

    return ok({ item: mapCatalogItem(data) });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; catalogId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id, catalogId } = await params;

    const admin = adminClient();
    const { error } = await admin
      .from("supplier_catalog_items")
      .delete()
      .eq("id", catalogId)
      .eq("supplier_id", id);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to delete catalog item",
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
