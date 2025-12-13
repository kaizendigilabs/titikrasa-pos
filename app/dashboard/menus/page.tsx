import { redirect } from "next/navigation";

import { MenusTable } from "./data-table";
import {
  getMenusTableBootstrap,
  type MenusTableBootstrap,
} from "@/features/menus/server";
import {
  ensureAdminOrManager,
  requireActor,
  type ActorContext,
} from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function MenusPage() {
  let actor!: ActorContext;
  let bootstrap!: MenusTableBootstrap;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    bootstrap = await getMenusTableBootstrap(actor.supabase);
  } catch (error) {
    if (
      error instanceof AppError &&
      error.statusCode === ERR.FORBIDDEN.statusCode
    ) {
      redirect("/dashboard?error=forbidden");
    }
    if (
      error instanceof AppError &&
      error.statusCode === ERR.UNAUTHORIZED.statusCode
    ) {
      redirect("/login");
    }
    console.error("[MENUS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 lg:px-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Menus
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your menus.
        </p>
      </div>
      <MenusTable
        initialMenus={bootstrap.initialMenus}
        initialMeta={bootstrap.initialMeta}
        categories={bootstrap.categories}
        canManage={actor.roles.isAdmin || actor.roles.isManager}
      />
    </div>
  );
}
