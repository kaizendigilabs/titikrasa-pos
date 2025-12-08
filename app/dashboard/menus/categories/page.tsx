import { redirect } from "next/navigation";

import { MenuCategoriesTable } from "./data-table";
import { getMenuCategoriesBootstrap } from "@/features/menu-categories/server";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function MenuCategoriesPage() {
  let actor!: Awaited<ReturnType<typeof requireActor>>;
  let bootstrap!: Awaited<
    ReturnType<typeof getMenuCategoriesBootstrap>
  >;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    bootstrap = await getMenuCategoriesBootstrap(actor.supabase);
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
    console.error("[MENU_CATEGORIES_PAGE_ERROR]", error);
    redirect("/dashboard");
  }

  return (
    <MenuCategoriesTable
      initialCategories={bootstrap.initialCategories}
      initialMeta={bootstrap.initialMeta}
      canManage={actor.roles.isAdmin || actor.roles.isManager}
    />
  );
}
