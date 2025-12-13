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
      redirect("/dashboard?error=forbidden");
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
    <div className="flex flex-1 flex-col gap-6 px-4 lg:px-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Recipes
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your recipes.
        </p>
      </div>
      <RecipesTable
        initialRecipes={bootstrap.initialRecipes}
        initialMeta={bootstrap.initialMeta}
        menus={bootstrap.menus}
        ingredients={bootstrap.ingredients}
        canManage={actor.roles.isAdmin || actor.roles.isManager}
      />
    </div>
  );
}
