import { NextRequest } from "next/server";
import { z } from "zod";

import { getMenuById } from "@/features/menus/server";
import { updateMenuSchema } from "@/features/menus/model/forms/schema";
import { toPersistedVariants } from "@/features/menus/utils";
import { mapMenuRow } from "@/features/menus/data/dto";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";
import type { Database } from "@/lib/types/database";

const paramsSchema = z.object({
  menuId: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ menuId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { menuId } = paramsSchema.parse(await params);
    const menu = await getMenuById(actor.supabase, menuId);

    if (!menu) {
      throw ERR.NOT_FOUND;
    }

    return ok(menu);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Parameter menu tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ menuId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { menuId } = paramsSchema.parse(await params);
    const payload = await request.json();
    const parsed = updateMenuSchema.parse(payload);

    const existing = await getMenuById(actor.supabase, menuId);
    if (!existing) {
      throw ERR.NOT_FOUND;
    }

    const patch: Database["public"]["Tables"]["menus"]["Update"] = {};

    if (parsed.name !== undefined) patch.name = parsed.name;
    if (parsed.sku !== undefined) patch.sku = parsed.sku;
    if (parsed.categoryId !== undefined) patch.category_id = parsed.categoryId;
    if (parsed.thumbnailUrl !== undefined)
      patch.thumbnail_url = parsed.thumbnailUrl;
    if (parsed.isActive !== undefined) patch.is_active = parsed.isActive;

    if (parsed.type === "simple") {
      patch.variants = null;
      if (parsed.price !== undefined) {
        patch.price = parsed.price;
      } else if (existing.price === null) {
        throw appError(ERR.VALIDATION_ERROR, {
          message: "Menu simple wajib memiliki harga retail",
        });
      }
      if (parsed.resellerPrice !== undefined) {
        patch.reseller_price = parsed.resellerPrice;
      }
    } else if (parsed.type === "variant") {
      if (parsed.variants) {
        patch.variants = toPersistedVariants(parsed.variants);
      }
      patch.price = null;
      patch.reseller_price = null;
    } else if (parsed.type === undefined) {
      if (parsed.price !== undefined) {
        patch.price = parsed.price;
      }
      if (parsed.resellerPrice !== undefined) {
        patch.reseller_price = parsed.resellerPrice;
      }
      if (parsed.variants !== undefined) {
        patch.variants = parsed.variants
          ? toPersistedVariants(parsed.variants)
          : null;
      }
    }

    if (Object.keys(patch).length === 0) {
      return ok(existing);
    }

    const { data, error } = await actor.supabase
      .from("menus")
      .update(patch)
      .eq("id", menuId)
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
        message: "Gagal memperbarui menu",
        details: { hint: error.message, menuId },
      });
    }

    return ok(mapMenuRow(data));
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Input pembaruan menu tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ menuId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { menuId } = paramsSchema.parse(await params);
    const existing = await getMenuById(actor.supabase, menuId);
    if (!existing) {
      throw ERR.NOT_FOUND;
    }

    const { error } = await actor.supabase
      .from("menus")
      .delete()
      .eq("id", menuId);

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Gagal menghapus menu",
        details: { hint: error.message, menuId },
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
          message: "Parameter menu tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}
