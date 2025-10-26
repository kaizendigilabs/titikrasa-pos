import { NextRequest } from "next/server";

import { profileUpdateSchema } from "@/features/users/schemas";
import { adminClient, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    const { id } = await params;

    if (!id) {
      throw appError(ERR.BAD_REQUEST, { message: "Missing user id" });
    }

    const isSelf = actor.user.id === id;
    if (!isSelf && !actor.roles.isAdmin) {
      throw ERR.FORBIDDEN;
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const body = profileUpdateSchema.parse(payload ?? {});

    const trimmedName =
      typeof body.name === "string" ? body.name.trim() : undefined;
    const trimmedEmail =
      typeof body.email === "string" ? body.email.trim() : undefined;
    const trimmedPhone =
      typeof body.phone === "string" ? body.phone.trim() : undefined;

    const profileUpdates: Record<string, unknown> = {};
    if (trimmedName !== undefined) {
      profileUpdates.name = trimmedName;
    }
    if (trimmedEmail !== undefined) {
      profileUpdates.email = trimmedEmail;
    }
    if (trimmedPhone !== undefined) {
      profileUpdates.phone =
        trimmedPhone.length > 0 ? trimmedPhone : null;
    }

    const metadataUpdates: Record<string, unknown> = {};
    if (trimmedName !== undefined) {
      metadataUpdates.full_name = trimmedName;
    }
    if (trimmedPhone !== undefined) {
      metadataUpdates.phone = trimmedPhone.length > 0 ? trimmedPhone : null;
    }

    const authPayload: {
      email?: string;
      password?: string;
      data?: Record<string, unknown>;
    } = {};

    if (Object.keys(metadataUpdates).length > 0) {
      authPayload.data = metadataUpdates;
    }
    if (trimmedEmail !== undefined) {
      authPayload.email = trimmedEmail;
    }
    if (body.password) {
      authPayload.password = body.password;
    }

    const admin = adminClient();

    if (Object.keys(authPayload).length > 0) {
      if (isSelf) {
        const { error: authError } = await actor.supabase.auth.updateUser(
          authPayload,
        );
        if (authError) {
          throw appError(ERR.SERVER_ERROR, {
            message: "Failed to update account",
            details: { hint: authError.message },
          });
        }
      } else {
        const { error: authError } = await admin.auth.admin.updateUserById(
          id,
          {
            email: authPayload.email,
            password: authPayload.password,
            user_metadata: authPayload.data,
          },
        );
        if (authError) {
          throw appError(ERR.SERVER_ERROR, {
            message: "Failed to update account",
            details: { hint: authError.message },
          });
        }
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const profileClient = isSelf ? actor.supabase : admin;
      const { error: profileError } = await profileClient
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", id);

      if (profileError) {
        throw appError(ERR.SERVER_ERROR, {
          message: "Failed to update profile",
          details: { hint: profileError.message },
        });
      }
    }

    const { data, error } = await actor.supabase
      .from("profiles")
      .select("user_id, name, email, phone")
      .eq("user_id", id)
      .maybeSingle();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to load profile",
        details: { hint: error.message },
      });
    }

    return ok({
      user_id: data?.user_id ?? id,
      name: data?.name ?? null,
      email: data?.email ?? trimmedEmail ?? actor.user.email ?? null,
      phone: data?.phone ?? null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
