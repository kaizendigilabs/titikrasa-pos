import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import {
  createSupplierSchema,
  supplierFiltersSchema,
} from "@/features/procurements/suppliers/model/forms/schema";
import { mapSupplierRow } from "@/features/procurements/suppliers/data/dto";
import {
  adminClient,
  ensureAdminOrManager,
  requireActor,
} from "@/features/users/server";

const MAX_PAGE_SIZE = 200;

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = supplierFiltersSchema.parse(params);

    const limit = Math.min(filters.pageSize, MAX_PAGE_SIZE);
    const from = (filters.page - 1) * limit;
    const to = from + limit - 1;

    let query = actor.supabase
      .from("suppliers")
      .select("*, supplier_catalog_items(count)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      query = query.or(`name.ilike.${pattern},contact->>email.ilike.${pattern},contact->>phone.ilike.${pattern}`);
    }

    if (filters.status !== "all") {
      query = query.eq("is_active", filters.status === "active");
    }

    const { data, error, count } = await query;
    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch suppliers",
        details: { hint: error.message },
      });
    }

    const suppliers = (data ?? []).map(mapSupplierRow);

    return ok(
      { suppliers },
      {
        meta: {
          pagination: {
            page: filters.page,
            pageSize: limit,
            total: count ?? suppliers.length,
          },
          filters: {
            search: filters.search ?? null,
            status: filters.status,
          },
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

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const payload = await request.json();
    const body = createSupplierSchema.parse(payload);

    const admin = adminClient();
    const { data, error } = await admin
      .from("suppliers")
      .insert({
        name: body.name,
        contact: body.contact ?? {},
        is_active: body.isActive ?? true,
      })
      .select("*, supplier_catalog_items(count)")
      .single();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to create supplier",
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
