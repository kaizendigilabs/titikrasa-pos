import { NextRequest } from "next/server";
import { z } from "zod";

import { getMenuById } from "@/features/menus/server";
import { mapMenuRow } from "@/features/menus/mappers";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const paramsSchema = z.object({
  menuId: z.string().uuid(),
});

const payloadSchema = z.object({
  isActive: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ menuId: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { menuId } = paramsSchema.parse(await params);
    const { isActive } = payloadSchema.parse(await request.json());

    const existing = await getMenuById(actor.supabase, menuId);
    if (!existing) {
      throw ERR.NOT_FOUND;
    }

    const { data, error } = await actor.supabase
      .from("menus")
      .update({ is_active: isActive })
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
        message: "Gagal memperbarui status menu",
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
          message: "Input status menu tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}
