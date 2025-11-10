import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { ERR, appError } from "@/lib/utils/errors";
import { mapProfileToUser, type RawUserRow } from "./mappers";
import type { UserListItem } from "./types";

type RoleFlags = {
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
};

export type ActorContext = {
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  user: User;
  roles: RoleFlags;
};

export type UsersTableBootstrap = {
  initialUsers: UserListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: "all" | "active" | "inactive";
      role: string | null;
      search: string | null;
    };
  };
  initialRoles: Array<{ id: string; name: string }>;
};

export async function requireActor(): Promise<ActorContext> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw ERR.UNAUTHORIZED;
  }

  const roles = await resolveRoleFlags(supabase, user.id);

  return { supabase, user, roles };
}

export function ensureAdmin(roles: RoleFlags) {
  if (!roles.isAdmin) {
    throw ERR.FORBIDDEN;
  }
}

export function ensureAdminOrManager(roles: RoleFlags) {
  if (!roles.isAdmin && !roles.isManager) {
    throw ERR.FORBIDDEN;
  }
}

export function ensureStaffOrAbove(roles: RoleFlags) {
  if (!roles.isAdmin && !roles.isManager && !roles.isStaff) {
    throw ERR.FORBIDDEN;
  }
}

export async function getRoleIdByName(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  roleName: "admin" | "manager" | "staff",
) {
  const { data, error } = await supabase
    .from("roles")
    .select("id, name")
    .eq("name", roleName)
    .maybeSingle();

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load role definition",
      details: { hint: error.message, roleName },
    });
  }

  if (!data) {
    throw appError(ERR.BAD_REQUEST, {
      message: `Role ${roleName} is not configured`,
    });
  }

  return data.id;
}

export function adminClient() {
  return createAdminClient();
}

export async function getUsersTableBootstrap(
  actor: ActorContext,
  options: { pageSize?: number } = {},
): Promise<UsersTableBootstrap> {
  const pageSize = options.pageSize ?? 50;

  const { data, error, count } = await actor.supabase
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
    .range(0, pageSize - 1);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load initial users",
      details: { hint: error.message },
    });
  }

  const initialUsers =
    (data as RawUserRow[] | null)?.map(mapProfileToUser) ?? [];

  const { data: roleData, error: rolesError } = await actor.supabase
    .from("roles")
    .select("id, name")
    .order("name", { ascending: true });

  if (rolesError) {
    console.error("[USERS_BOOTSTRAP_ROLES_ERROR]", rolesError);
  }

  return {
    initialUsers,
    initialMeta: {
      pagination: {
        page: 1,
        pageSize,
        total: count ?? initialUsers.length,
      },
      filters: {
        status: "all",
        role: null,
        search: null,
      },
    },
    initialRoles: roleData ?? [],
  };
}

async function resolveRoleFlags(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
): Promise<RoleFlags> {
  const isAdmin = await rpcHasRole(supabase, userId, "admin");
  const isManager = await rpcHasRole(supabase, userId, "manager");
  const isStaff = await rpcHasRole(supabase, userId, "staff");

  return { isAdmin, isManager, isStaff };
}

async function rpcHasRole(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  roleName: "admin" | "manager" | "staff",
) {
  const { data, error } = await supabase.rpc("has_role", {
    uid: userId,
    role_name: roleName,
  });
  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to verify role",
      details: { hint: error.message, roleName },
    });
  }

  return Boolean(data);
}
