import { NextRequest } from "next/server";
import { z } from "zod";

import { createUserSchema } from "@/features/users/schemas";
import {
  adminClient,
  ensureAdmin,
  ensureAdminOrManager,
  getRoleIdByName,
  requireActor,
} from "@/features/users/server";
import { mapProfileToUser } from "@/features/users/mappers";
import type { UserListItem } from "@/features/users/types";
import { ok, fail } from "@/lib/utils/api-response";
import { recordAudit } from "@/lib/utils/audit";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(1000).default(20),
  search: z.string().trim().optional(),
  status: z
    .enum(["active", "inactive", "all"])
    .default("all"),
  role: z.enum(["admin", "manager", "staff"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { page, pageSize, search, status, role } =
      listQuerySchema.parse(params);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = actor.supabase
      .from("profiles")
      .select(
        `
        user_id,
        name,
        email,
        phone,
        avatar,
        is_active,
        last_login_at,
        created_at,
        updated_at,
        user_roles (
          role_id,
          roles (
            id,
            name
          )
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status !== "all") {
      query = query.eq("is_active", status === "active");
    }

    if (search && search.length > 0) {
      const pattern = `%${search}%`;
      query = query.or(
        `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to fetch users",
        details: { hint: error.message },
      });
    }

    const items: UserListItem[] = (data ?? []).map(mapProfileToUser);

    const filteredItems =
      role != null
        ? items.filter((item) => item.role === role)
        : items;

    return ok(
      { items: filteredItems },
      {
        meta: {
          pagination: {
            page,
            pageSize,
            total: role ? filteredItems.length : count ?? filteredItems.length,
          },
          filters: {
            status,
            role: role ?? null,
            search: search ?? null,
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
          message: "Invalid query parameters",
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
    ensureAdmin(actor.roles);

    const payload = await request.json();
    const { email, name, phone, role, password } =
      createUserSchema.parse(payload);

    const roleId = await getRoleIdByName(actor.supabase, role);
    const admin = adminClient();

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          phone,
        },
      });

    if (createError) {
      throw mapCreateUserError(createError);
    }

    const newUser = created.user;
    if (!newUser) {
      throw appError(ERR.SERVER_ERROR, {
        message: "User creation returned no user entity",
      });
    }

    const { error: roleError } = await admin
      .from("user_roles")
      .insert({ user_id: newUser.id, role_id: roleId });

    if (roleError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to assign role to user",
        details: { hint: roleError.message },
      });
    }

    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({ name, phone })
      .eq("user_id", newUser.id);

    if (profileUpdateError) {
      console.warn("[USER_CREATE_PROFILE_UPDATE]", profileUpdateError);
    }

    const { data: fetched, error: fetchError } = await actor.supabase
      .from("profiles")
      .select(
        `
        user_id,
        name,
        email,
        phone,
        avatar,
        is_active,
        last_login_at,
        created_at,
        updated_at,
        user_roles (
          role_id,
          roles (
            id,
            name
          )
        )
      `,
      )
      .eq("user_id", newUser.id)
      .maybeSingle();

    if (fetchError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to load created user",
        details: { hint: fetchError.message },
      });
    }

    if (!fetched) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Created user could not be loaded",
      });
    }

    await recordAudit(admin, {
      actorId: actor.user.id,
      action: "users.create",
      entity: "users",
      entityId: newUser.id,
      before: null,
      after: {
        email,
        name,
        role,
        is_active: true,
      },
    });

    return ok(mapProfileToUser(fetched));
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }

    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Invalid user payload",
          details: { issues: error.issues },
        }),
      );
    }

    return fail(error);
  }
}

function mapCreateUserError(error: { message: string }) {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("user already registered")) {
    return appError(ERR.VALIDATION_ERROR, {
      message: "Email is already registered",
    });
  }

  if (message.includes("duplicate key value violates unique constraint")) {
    return appError(ERR.VALIDATION_ERROR, {
      message: "Email must be unique",
    });
  }

  return appError(ERR.SERVER_ERROR, {
    message: "Failed to create user",
    details: { hint: error.message },
  });
}
