import { NextRequest } from "next/server";
import { z } from "zod";

import {
  ensureCategoryIsUnused,
  getMenuCategoryById,
} from "@/features/menu-categories/server";
import { updateMenuCategorySchema } from "@/features/menu-categories/schemas";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import type { Database } from "@/lib/types/database";
import { mapCategoryRow } from "@/features/menu-categories/mappers";

const paramsSchema = z.object({
  categoryId: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { categoryId } = paramsSchema.parse(await params);
    const category = await getMenuCategoryById(actor.supabase, categoryId);

    if (!category) {
      throw ERR.NOT_FOUND;
    }

    return ok(category);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Parameter kategori tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { categoryId } = paramsSchema.parse(await params);
    const payload = await request.json();
    const parsed = updateMenuCategorySchema.parse(payload);

    const existing = await getMenuCategoryById(actor.supabase, categoryId);
    if (!existing) {
      throw ERR.NOT_FOUND;
    }

    const patch: Database["public"]["Tables"]["categories"]["Update"] = {};
    if (parsed.name !== undefined) patch.name = parsed.name;
    if (parsed.slug !== undefined) patch.slug = parsed.slug;
    if (parsed.iconUrl !== undefined) patch.icon_url = parsed.iconUrl;
    if (parsed.sortOrder !== undefined) {
      patch.sort_order =
        parsed.sortOrder ?? existing.sort_order ?? 0;
    }
    if (parsed.isActive !== undefined) patch.is_active = parsed.isActive;

    if (Object.keys(patch).length === 0) {
      return ok(existing);
    }

    const { data, error } = await actor.supabase
      .from("categories")
      .update(patch)
      .eq("id", categoryId)
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
        message: "Gagal memperbarui kategori",
        details: { hint: error.message, categoryId },
      });
    }

    return ok(mapCategoryRow(data));
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Input pembaruan kategori tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { categoryId } = paramsSchema.parse(await params);
    const existing = await getMenuCategoryById(actor.supabase, categoryId);
    if (!existing) {
      throw ERR.NOT_FOUND;
    }

    await ensureCategoryIsUnused(actor.supabase, categoryId);

    const { error } = await actor.supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal menghapus kategori",
        details: { hint: error.message, categoryId },
      });
    }

    return ok({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Parameter kategori tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}
