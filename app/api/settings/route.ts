import { NextRequest } from "next/server";

import { z } from "zod";

import { getSettings, updateSettings } from "@/features/settings/server";
import { settingsUpdateSchema } from "@/features/settings/schemas";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const settings = await getSettings(actor);
    return ok({ settings });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const payload = await request.json();
    const parsed = settingsUpdateSchema.parse(payload);

    const settings = await updateSettings(actor, parsed);
    return ok({ settings });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Input pengaturan tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    if (error instanceof SyntaxError) {
      return fail(
        appError(ERR.BAD_REQUEST, {
          message: "Payload tidak valid",
        }),
      );
    }
    return fail(error);
  }
}
