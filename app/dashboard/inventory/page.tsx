import { redirect } from "next/navigation";

import { StoreIngredientsTable } from "./StoreIngredientsTable";
import { getStoreIngredientsTableBootstrap } from "@/features/inventory/store-ingredients/server";
import { requireActor } from "@/features/users/server";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 25;

export default async function InventoryPage() {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null;
  let bootstrap: Awaited<
    ReturnType<typeof getStoreIngredientsTableBootstrap>
  > | null = null;

  try {
    actor = await requireActor();
    bootstrap = await getStoreIngredientsTableBootstrap(actor, {
      pageSize: DEFAULT_PAGE_SIZE,
    });
  } catch (error) {
    console.error("[INVENTORY_PAGE_ERROR]", error);
    redirect("/dashboard");
  }

  if (!actor || !bootstrap) {
    redirect("/dashboard");
  }

  const canManage = actor.roles.isAdmin || actor.roles.isManager;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Store Ingredients</h1>
        <p className="text-sm text-muted-foreground">
          Monitor ingredient stock levels, average costs, and recent purchasing activity.
        </p>
      </div>
      <StoreIngredientsTable
        initialItems={bootstrap.initialItems}
        initialMeta={bootstrap.initialMeta}
        canManage={canManage}
      />
    </div>
  );
}
