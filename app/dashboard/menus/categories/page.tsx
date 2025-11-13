import { redirect } from "next/navigation";

import { MenuCategoriesTable } from "./data-table";
import { getMenuCategoriesBootstrap } from "@/features/menu-categories/server";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function MenuCategoriesPage() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const bootstrap = await getMenuCategoriesBootstrap(actor.supabase);

    return (
      <MenuCategoriesTable
        initialCategories={bootstrap.initialCategories}
        initialMeta={bootstrap.initialMeta}
        canManage={actor.roles.isAdmin || actor.roles.isManager}
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
    if (
      error instanceof AppError &&
      error.statusCode === ERR.UNAUTHORIZED.statusCode
    ) {
      redirect("/login");
    }
    console.error("[MENU_CATEGORIES_PAGE_ERROR]", error);
    redirect("/dashboard");
  }
}
