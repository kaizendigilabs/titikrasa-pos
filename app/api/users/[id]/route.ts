import { NextRequest } from "next/server";
import { z } from "zod";

import { updateUserSchema } from "@/features/users/schemas";
import {
  adminClient,
  ensureAdmin,
  ensureAdminOrManager,
  getRoleIdByName,
  requireActor,
  type ActorContext,
} from "@/features/users/server";
import { fetchUserById } from "@/features/users/queries";
import type { ProfileRow, UserListItem } from "@/features/users/types";
import { ok, fail } from "@/lib/utils/api-response";
import { recordAudit } from "@/lib/utils/audit";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const idSchema = z.object({
  id: z.string().uuid("Invalid user id"),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { id } = idSchema.parse(await context.params);

    const user = await getUser(actor, id);
    if (!user) {
      throw ERR.NOT_FOUND;
    }

    return ok(user);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdmin(actor.roles);

    const { id } = idSchema.parse(await context.params);
    const payload = await request.json();
    const updates = updateUserSchema.parse(payload);

    const before = await getUser(actor, id);
    if (!before) {
      throw ERR.NOT_FOUND;
    }

    const admin = adminClient();
    const profileUpdates: Partial<ProfileRow> = {};

    let shouldUpdateDisplayName = false;
    const authMetadataUpdates: Record<string, unknown> = {};

    if (updates.name && updates.name !== before.name) {
      profileUpdates.name = updates.name;
      shouldUpdateDisplayName = true;
      authMetadataUpdates.display_name = updates.name;
    }

    if (typeof updates.phone === "string" && updates.phone !== before.phone) {
      profileUpdates.phone = updates.phone;
      authMetadataUpdates.phone = updates.phone;
    }

    if (
      typeof updates.isActive === "boolean" &&
      updates.isActive !== before.is_active
    ) {
      profileUpdates.is_active = updates.isActive;
    }

    if (
      typeof updates.isActive === "boolean" &&
      updates.isActive === false
    ) {
      await guardLastAdmin(actor, id, "Cannot deactivate the last admin");
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await admin
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", id);

      if (profileError) {
        throw appError(ERR.SERVER_ERROR, {
          message: "Failed to update user profile",
          details: { hint: profileError.message },
        });
      }
    }

    if (shouldUpdateDisplayName || Object.keys(authMetadataUpdates).length > 0) {
      const { error: authError } = await admin.auth.admin.updateUserById(id, {
        user_metadata: authMetadataUpdates,
      });

      if (authError) {
        throw appError(ERR.SERVER_ERROR, {
          message: "Failed to update auth profile",
          details: { hint: authError.message },
        });
      }
    }

    if (updates.role && updates.role !== before.role) {
      if (before.role === "admin" && updates.role !== "admin") {
        await guardLastAdmin(actor, id, "Cannot demote the last admin");
      }

      const roleId = await getRoleIdByName(actor.supabase, updates.role);
      const { error: roleError } = await admin
        .from("user_roles")
        .upsert(
          { user_id: id, role_id: roleId },
          { onConflict: "user_id" },
        );

      if (roleError) {
        throw mapRoleMutationError(roleError);
      }
    }

    const after = await getUser(actor, id);
    if (!after) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to load updated user",
      });
    }

    await recordAudit(admin, {
      actorId: actor.user.id,
      action: "users.update",
      entity: "users",
      entityId: id,
      before,
      after,
    });

    return ok(after);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    ensureAdmin(actor.roles);

    const { id } = idSchema.parse(await context.params);
    if (id === actor.user.id) {
      throw appError(ERR.BAD_REQUEST, {
        message: "You cannot deactivate your own account",
      });
    }

    const before = await getUser(actor, id);
    if (!before) {
      throw ERR.NOT_FOUND;
    }

    await guardLastAdmin(actor, id, "Cannot delete the last admin");

    const admin = adminClient();

    const { error: roleDeleteError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", id);

    if (roleDeleteError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to delete user role assignments",
        details: { hint: roleDeleteError.message },
      });
    }

    const { error: profileDeleteError } = await admin
      .from("profiles")
      .delete()
      .eq("user_id", id);

    if (profileDeleteError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to delete user profile",
        details: { hint: profileDeleteError.message },
      });
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(id);

    if (authDeleteError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to delete auth user",
        details: { hint: authDeleteError.message },
      });
    }

    await recordAudit(admin, {
      actorId: actor.user.id,
      action: "users.delete",
      entity: "users",
      entityId: id,
      before,
      after: null,
    });

    return ok({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function guardLastAdmin(
  actor: ActorContext,
  userId: string,
  message: string,
) {
  const { data, error } = await actor.supabase.rpc("is_last_admin_user", {
    p_user_id: userId,
  });

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to validate admin guard",
      details: { hint: error.message },
    });
  }

  if (data) {
    throw appError(ERR.FORBIDDEN, { message });
  }
}

async function getUser(
  actor: ActorContext,
  userId: string,
): Promise<UserListItem | null> {
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

function handleRouteError(error: unknown) {
  if (error instanceof AppError) {
    return fail(error);
  }

  if (error instanceof z.ZodError) {
    return fail(
      appError(ERR.VALIDATION_ERROR, {
        message: "Invalid request",
        details: { issues: error.issues },
      }),
    );
  }

  return fail(error);
}

function mapRoleMutationError(error: { message: string }) {
  const message = error.message ?? "";

  if (message.includes("Tidak bisa menurunkan role")) {
    return appError(ERR.FORBIDDEN, {
      message: "Cannot demote the last admin user",
    });
  }

  if (message.includes("Tidak bisa menghapus admin terakhir")) {
    return appError(ERR.FORBIDDEN, {
      message: "Cannot remove the last admin user",
    });
  }

  return appError(ERR.SERVER_ERROR, {
    message: "Failed to update user role",
    details: { hint: message },
  });
}
