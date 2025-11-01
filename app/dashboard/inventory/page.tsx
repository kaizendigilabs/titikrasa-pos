import { redirect } from "next/navigation";

import { StoreIngredientsTableScreen } from "@/features/inventory/store-ingredients/ui/components/store-ingredients-table";
import { fetchStoreIngredients } from "@/features/inventory/store-ingredients/server";
import { storeIngredientFiltersSchema } from "@/features/inventory/store-ingredients/model/forms/schema";
import { requireActor } from "@/features/users/server";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 25;

export default async function InventoryPage() {
  const filters = storeIngredientFiltersSchema.parse({
    page: "1",
    pageSize: String(DEFAULT_PAGE_SIZE),
    status: "all",
    lowStockOnly: "false",
  });

  let initialItems:
    | Awaited<ReturnType<typeof fetchStoreIngredients>>["items"]
    | undefined;
  let result: Awaited<ReturnType<typeof fetchStoreIngredients>> | null = null;
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null;

  try {
    actor = await requireActor();
    result = await fetchStoreIngredients(filters);
    initialItems = result.items;
  } catch (error) {
    console.error("[INVENTORY_PAGE_ERROR]", error);
    redirect("/dashboard");
  }

  if (!result || !initialItems || !actor) {
    redirect("/dashboard");
  }

  const initialMeta = {
    pagination: {
      page: filters.page,
      pageSize: result.limit,
      total: result.total,
    },
    filters: {
      search: filters.search ?? null,
      status: filters.status,
      lowStockOnly: Boolean(filters.lowStockOnly),
    },
  };

  const canManage = actor.roles.isAdmin || actor.roles.isManager;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Store Ingredients</h1>
        <p className="text-sm text-muted-foreground">
          Monitor ingredient stock levels, average costs, and recent purchasing activity.
        </p>
      </div>
      <StoreIngredientsTableScreen
        initialItems={initialItems}
        initialMeta={initialMeta}
        canManage={canManage}
      />
    </div>
  );
}
