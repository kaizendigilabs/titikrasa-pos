import { redirect } from "next/navigation";

import { UsersTable } from "./UsersTable";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { mapProfileToUser, type RawUserRow } from "@/features/users/mappers";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function UsersPage() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

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
      .range(0, PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const initialUsers =
      (data as RawUserRow[] | null)?.map(mapProfileToUser) ?? [];

    const { data: roleData, error: rolesError } = await actor.supabase
      .from("roles")
      .select("id, name")
      .order("name", { ascending: true });

    if (rolesError) {
      console.error("[USERS_PAGE_ROLES_ERROR]", rolesError);
    }

    const initialMeta = {
      pagination: {
        page: 1,
        pageSize: PAGE_SIZE,
        total: count ?? initialUsers.length,
      },
      filters: {
        status: "all" as const,
        role: null as string | null,
        search: null as string | null,
      },
    };

    return (
      <UsersTable
        initialUsers={initialUsers}
        initialMeta={initialMeta}
        initialRoles={roleData ?? []}
        currentUserId={actor.user.id}
        canManage={actor.roles.isAdmin}
      />
    );
  } catch (error) {
    if (
      error instanceof AppError &&
      error.statusCode === ERR.FORBIDDEN.statusCode
    ) {
      redirect(
        "/dashboard?status=forbidden&message=You%20do%20not%20have%20permission%20to%20access%20this%20resource",
      );
    }
    console.error("[USERS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }
}
