import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  createCatalogItemSchema,
  supplierCatalogFiltersSchema,
} from "@/features/procurements/suppliers/schemas";
import type {
  SupplierCatalogItem,
  SupplierCatalogWithLinks,
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
    unit_label: row.unit_label,
    conversion_rate: Number(row.conversion_rate ?? 1),
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

function mapCatalogWithLinks(row: any): SupplierCatalogWithLinks {
  const items = Array.isArray(row.ingredient_supplier_links)
    ? row.ingredient_supplier_links
    : [];
  const links = items.map((link: any) => ({
    id: String(link.id ?? ""),
    storeIngredientId: String(link.store_ingredient_id ?? ""),
    ingredientName: link.store_ingredients?.name ?? "—",
    baseUom: link.store_ingredients?.base_uom ?? null,
    preferred: Boolean(link.preferred),
    lastPurchasePrice:
      typeof link.last_purchase_price === "number"
        ? link.last_purchase_price
        : null,
    lastPurchasedAt: link.last_purchased_at ?? null,
  }));
  return {
    ...mapCatalogItem(row),
    links,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = await params;
    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = supplierCatalogFiltersSchema.parse(queryParams);

    const limit = Math.min(filters.pageSize, 100);
    const from = (filters.page - 1) * limit;
    const to = from + limit - 1;

    let query = actor.supabase
      .from("supplier_catalog_items")
      .select(
        `*, ingredient_supplier_links(
          id,
          store_ingredient_id,
          preferred,
          last_purchase_price,
          last_purchased_at,
          store_ingredients(name, base_uom)
        )`,
        { count: "exact" },
      )
      .eq("supplier_id", id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.status !== "all") {
      query = query.eq("is_active", filters.status === "active");
    }

    if (filters.search?.trim()) {
      query = query.ilike("name", `%${filters.search.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch catalog",
        details: { hint: error.message },
      });
    }

    const items = (data ?? []).map(mapCatalogWithLinks);

    return ok(
      { items },
      {
        meta: {
          pagination: {
            page: filters.page,
            pageSize: limit,
            total: count ?? items.length,
          },
          filters,
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
      purchase_price: Math.round(body.purchasePrice * 100), // Convert to cents
      unit_label: body.unitLabel,
      conversion_rate: body.conversionRate,
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
