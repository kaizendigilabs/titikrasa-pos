import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  createCatalogItemSchema,
} from "@/features/procurements/suppliers/schemas";
import {
  type SupplierCatalogItem,
} from "@/features/procurements/suppliers/types";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";
import type { TablesInsert } from "@/lib/types/database";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;

    const { data, error } = await actor.supabase
      .from("supplier_catalog_items")
      .select("*")
      .eq("supplier_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch catalog",
        details: { hint: error.message },
      });
    }

    const items = (data ?? []).map(mapCatalogItem);
    return ok({ items });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;
    const payload = await request.json();
    const body = createCatalogItemSchema.parse({ ...payload, supplierId: payload.supplierId ?? id });

    if (body.supplierId !== id) {
      throw appError(ERR.BAD_REQUEST, {
        message: "Supplier mismatch",
      });
    }

    const admin = adminClient();
    const insertPayload: TablesInsert<"supplier_catalog_items"> = {
      supplier_id: id,
      name: body.name,
      base_uom: body.baseUom,
      purchase_price: body.purchasePrice,
      is_active: body.isActive ?? true,
    };
    const { data, error } = await admin
      .from("supplier_catalog_items")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("[CREATE_CATALOG_ITEM_ERROR]", error);
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to create catalog item",
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
