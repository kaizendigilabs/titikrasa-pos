import { redirect } from "next/navigation";

import { RecipesTable } from "./RecipesTable";
import { fetchRecipes } from "@/features/recipes/server";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const [recipes, menusResult, ingredientsResult] = await Promise.all([
      fetchRecipes(actor.supabase, undefined),
      actor.supabase
        .from("menus")
        .select("id, name")
        .order("name", { ascending: true }),
      actor.supabase
        .from("store_ingredients")
        .select("id, name, base_uom")
        .order("name", { ascending: true }),
    ]);

    if (menusResult.error) {
      throw menusResult.error;
    }

    if (ingredientsResult.error) {
      throw ingredientsResult.error;
    }

    const menus = (menusResult.data ?? []).map((menu) => ({
      id: menu.id,
      name: menu.name,
    }));

    const ingredients = (ingredientsResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      baseUom: item.base_uom ?? "",
    }));

    const initialMeta = {
      pagination: {
        page: 1,
        pageSize: recipes.length,
        total: recipes.length,
      },
      filters: {
        search: null as string | null,
        menuId: null as string | null,
      },
    };

    return (
      <RecipesTable
        initialRecipes={recipes}
        initialMeta={initialMeta}
        menus={menus}
        ingredients={ingredients}
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
    console.error("[RECIPES_PAGE_ERROR]", error);
    redirect("/dashboard");
  }
}
