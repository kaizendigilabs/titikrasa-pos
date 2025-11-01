import { NextRequest } from "next/server";
import { z } from "zod";

import {
  createMenuCategorySchema,
  menuCategoryFiltersSchema,
} from "@/features/menu-categories/model/forms/schema";
import {
  getNextCategorySortOrder,
  getMenuCategoryById,
} from "@/features/menu-categories/server";
import { mapCategoryRow } from "@/features/menu-categories/data/dto";
import type { MenuCategory } from "@/features/menu-categories/types";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const listSchema = menuCategoryFiltersSchema.extend({
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { search, status, limit } = listSchema.parse(params);

    let query = actor.supabase
      .from("categories")
      .select(
        `
        id,
        name,
        slug,
        sort_order,
        is_active,
        icon_url,
        created_at
      `,
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
    }

    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query;

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal memuat daftar kategori",
        details: { hint: error.message },
      });
    }

    const items: MenuCategory[] = (data ?? []).map(mapCategoryRow);

    return ok(
      { items },
      {
        meta: {
          filters: {
            status,
            search: search ?? null,
          },
          pagination: {
            page: 1,
            pageSize: items.length,
            total: items.length,
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
          message: "Parameter pencarian kategori tidak valid",
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
    const parsed = createMenuCategorySchema.parse(payload);

    const sortOrder =
      parsed.sortOrder ?? (await getNextCategorySortOrder(actor.supabase));

    const { data, error } = await actor.supabase
      .from("categories")
      .insert({
        name: parsed.name,
        slug: parsed.slug,
        icon_url: parsed.iconUrl ?? null,
        sort_order: sortOrder,
        is_active: parsed.isActive ?? true,
      })
      .select(
        `
        id,
        name,
        slug,
        sort_order,
        is_active,
        icon_url,
        created_at
      `,
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        throw appError(ERR.VALIDATION_ERROR, {
          message: "Slug kategori sudah digunakan",
        });
      }
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal membuat kategori baru",
        details: { hint: error.message },
      });
    }

    const category = mapCategoryRow(data);

    const latest = await getMenuCategoryById(actor.supabase, category.id);
    return ok(latest ?? category, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Input kategori tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}
