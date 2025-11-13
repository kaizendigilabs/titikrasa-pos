import { redirect } from "next/navigation";

import { RecipesTable } from "./data-table";
import {
  getRecipesTableBootstrap,
  type RecipesTableBootstrap,
} from "@/features/recipes/server";
import {
  ensureAdminOrManager,
  requireActor,
  type ActorContext,
} from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  let actor!: ActorContext;
  let bootstrap!: RecipesTableBootstrap;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    bootstrap = await getRecipesTableBootstrap(actor.supabase);
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
    console.error("[RECIPES_PAGE_ERROR]", error);
    redirect("/dashboard");
  }

  return (
    <RecipesTable
      initialRecipes={bootstrap.initialRecipes}
      initialMeta={bootstrap.initialMeta}
      menus={bootstrap.menus}
      ingredients={bootstrap.ingredients}
      canManage={actor.roles.isAdmin || actor.roles.isManager}
    />
  );
}
