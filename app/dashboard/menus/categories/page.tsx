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
    <div className="flex flex-1 flex-col gap-6 px-4 lg:px-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Menu Categories
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your menu categories.
        </p>
      </div>
      <MenuCategoriesTable
        initialCategories={bootstrap.initialCategories}
        initialMeta={bootstrap.initialMeta}
        canManage={actor.roles.isAdmin || actor.roles.isManager}
      />
    </div>
  );
}
