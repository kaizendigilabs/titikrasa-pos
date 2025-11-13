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
      redirect(
        "/dashboard?status=forbidden&message=You%20do%20not%20have%20permission%20to%20access%20this%20resource",
      );
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
    <MenusTable
      initialMenus={bootstrap.initialMenus}
      initialMeta={bootstrap.initialMeta}
      categories={bootstrap.categories}
      canManage={actor.roles.isAdmin || actor.roles.isManager}
    />
  );
}
