import { redirect } from "next/navigation";

import { MenuTableScreen } from "@/features/menus/ui/components/menu-table";
import { mapMenuRow } from "@/features/menus/data/dto";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { AppError, ERR } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function MenusPage() {
  try {
    const actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    const [{ data: menuData, error: menuError }, { data: categoryData, error: categoryError }] =
      await Promise.all([
        actor.supabase
          .from("menus")
          .select(
            `
            id,
            name,
            sku,
            category_id,
            categories (
              id,
              name,
              icon_url
            ),
            price,
            reseller_price,
            is_active,
            thumbnail_url,
            variants,
            created_at
          `,
          )
          .order("created_at", { ascending: false })
          .limit(200),
        actor.supabase
          .from("categories")
          .select("id, name")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

    if (menuError) throw menuError;
    if (categoryError) throw categoryError;

    const items = (menuData ?? []).map(mapMenuRow);
    const categories =
      categoryData?.map((category) => ({
        id: category.id,
        name: category.name,
      })) ?? [];

    const initialMeta = {
      pagination: {
        page: 1,
        pageSize: items.length,
        total: items.length,
      },
      filters: {
        status: "all" as const,
        type: "all" as const,
        categoryId: null as string | null,
        search: null as string | null,
      },
    };

    return (
      <MenuTableScreen
        initialItems={items}
        initialMeta={initialMeta}
        categories={categories}
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
    console.error("[MENUS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }
}
