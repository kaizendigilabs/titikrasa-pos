import { NextRequest } from "next/server";
import { z } from "zod";

import { resetPasswordSchema } from "@/features/users/schemas";
import {
  adminClient,
  ensureAdmin,
  requireActor,
  type ActorContext,
} from "@/features/users/server";
import { fetchUserById } from "@/features/users/queries";
import { ok, fail } from "@/lib/utils/api-response";
import { recordAudit } from "@/lib/utils/audit";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const idSchema = z.object({
  id: z.string().uuid("Invalid user id"),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdmin(actor.roles);

    const { id } = idSchema.parse(await context.params);
    const target = await getUser(actor, id);
    if (!target) {
      throw ERR.NOT_FOUND;
    }

    if (!target.email) {
      throw appError(ERR.BAD_REQUEST, {
        message: "User does not have a valid email",
      });
    }

    let payload: unknown = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const { redirectTo } = resetPasswordSchema.parse(payload ?? {});

    const admin = adminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: target.email,
      options: {
        redirectTo: redirectTo ?? undefined,
      },
    });

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to generate reset link",
        details: { hint: error.message },
      });
    }

    await recordAudit(admin, {
      actorId: actor.user.id,
      action: "users.resetPassword",
      entity: "users",
      entityId: id,
      before: null,
      after: { redirectTo: redirectTo ?? null },
    });

    const resetLink = data?.properties?.action_link ?? null;
    const rawExpiresAt =
      (data?.user?.app_metadata as Record<string, unknown> | undefined)
        ?.expires_at;

    return ok({
      resetLink,
      expiresAt:
        typeof rawExpiresAt === "string" || rawExpiresAt === null
          ? rawExpiresAt
          : null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }

    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Invalid reset payload",
          details: { issues: error.issues },
        }),
      );
    }

    return fail(error);
  }
}

async function getUser(actor: ActorContext, userId: string) {
  try {
    return await fetchUserById(actor.supabase, userId);
  } catch (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load user",
      details: {
        hint: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}
