import { NextRequest } from "next/server";
import { z } from "zod";

import { createMenuSchema, menuFiltersSchema } from "@/features/menus/schemas";
import { mapMenuRow } from "@/features/menus/mappers";
import { toPersistedVariants } from "@/features/menus/utils";
import type { MenuListItem } from "@/features/menus/types";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import type { Database } from "@/lib/types/database";

const listSchema = menuFiltersSchema;

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { search, status, categoryId, type, page, pageSize } =
      listSchema.parse(params);

    let query = actor.supabase
      .from("menus")
      .select(
        `
        id,
        name,
        sku,
        category_id,
        categories (
          id,
          name,
          icon_url
        ),
        price,
        reseller_price,
        is_active,
        thumbnail_url,
        variants,
        created_at
      `,
      { count: "exact" },
    )
      .order("created_at", { ascending: false });

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(`name.ilike.${pattern},sku.ilike.${pattern}`);
    }

    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (type === "simple") {
      query = query.is("variants", null);
    } else if (type === "variant") {
      query = query.not("variants", "is", null);
    }

    const currentPage = page ?? 1;
    const currentPageSize = pageSize ?? 50;
    const from = (currentPage - 1) * currentPageSize;
    const to = from + currentPageSize - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal memuat daftar menu",
        details: { hint: error.message },
      });
    }

    const items: MenuListItem[] = (data ?? []).map(mapMenuRow);

    return ok(
      { items },
      {
        meta: {
          filters: {
            search: search ?? null,
            status,
            categoryId: categoryId ?? null,
            type,
          },
          pagination: {
            page: currentPage,
            pageSize: currentPageSize,
            total: count ?? items.length,
          },
        },
      },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }

    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Parameter pencarian menu tidak valid",
          details: { issues: error.issues },
        }),
      );
    }

    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const payload = await request.json();
    const parsed = createMenuSchema.parse(payload);

    const baseInsert: Database["public"]["Tables"]["menus"]["Insert"] = {
      name: parsed.name,
      sku: parsed.sku ?? null,
      category_id: parsed.categoryId ?? null,
      thumbnail_url: parsed.thumbnailUrl ?? null,
      is_active: parsed.isActive ?? true,
      price: null,
      reseller_price: null,
      variants: null,
    };

    if (parsed.type === "simple") {
      baseInsert.price = parsed.price;
      baseInsert.reseller_price = parsed.resellerPrice ?? null;
      baseInsert.variants = null;
    } else {
      baseInsert.price = null;
      baseInsert.reseller_price = null;
      baseInsert.variants = toPersistedVariants(parsed.variants);
    }

    const { data, error } = await actor.supabase
      .from("menus")
      .insert(baseInsert)
      .select(
        `
        id,
        name,
        sku,
        category_id,
        categories (
          id,
          name,
          icon_url
        ),
        price,
        reseller_price,
        is_active,
        thumbnail_url,
        variants,
        created_at
      `,
      )
      .single();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal membuat menu",
        details: { hint: error.message },
      });
    }

    return ok(mapMenuRow(data), { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Input menu tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}
