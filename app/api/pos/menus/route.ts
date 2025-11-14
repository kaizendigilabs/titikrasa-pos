import { NextRequest } from "next/server";
import { z } from "zod";

import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { searchPosMenus } from "@/features/pos/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, appError, ERR } from "@/lib/utils/errors";

const querySchema = z.object({
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { search } = querySchema.parse(params);
    const menus = await searchPosMenus(actor, { search: search ?? null });

    return ok({ items: menus });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Parameter pencarian tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}
