import { redirect } from "next/navigation";

import { CategoriesTable } from "./CategoriesTable";
import { mapCategoryRow } from "@/features/menu-categories/mappers";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function MenuCategoriesPage() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const { data, error } = await actor.supabase
      .from("categories")
      .select(
        `
        id,
        name,
        slug,
        sort_order,
        is_active,
        icon_url,
        created_at
      `,
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    const items = (data ?? []).map(mapCategoryRow);

    const initialMeta = {
      pagination: {
        page: 1,
        pageSize: items.length,
        total: items.length,
      },
      filters: {
        status: "all" as const,
        search: null as string | null,
      },
    };

    return (
      <CategoriesTable
        initialItems={items}
        initialMeta={initialMeta}
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
