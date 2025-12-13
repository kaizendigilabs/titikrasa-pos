import { redirect } from "next/navigation";

import { PurchaseOrdersTable } from "./data-table";
import { ensureAdminOrManager, requireActor } from "@/features/users/server";
import { getPurchaseOrdersTableBootstrap } from "@/features/procurements/purchase-orders/server";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 25;

export default async function PurchaseOrdersPage() {
  let actor!: Awaited<ReturnType<typeof requireActor>>;
  let bootstrap!: Awaited<
    ReturnType<typeof getPurchaseOrdersTableBootstrap>
  >;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);

    bootstrap = await getPurchaseOrdersTableBootstrap(actor, {
      pageSize: DEFAULT_PAGE_SIZE,
    });
  } catch (error) {
    console.error("[PURCHASE_ORDERS_PAGE_ERROR]", error);
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 lg:px-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
        <p className="text-sm text-muted-foreground">
          Create and track purchase orders to keep ingredient stock in sync.
        </p>
      </div>
      <PurchaseOrdersTable
        initialPurchaseOrders={bootstrap.initialPurchaseOrders}
        initialMeta={bootstrap.initialMeta}
        suppliers={bootstrap.suppliers}
        catalogItems={bootstrap.catalogItems}
        canManage={actor.roles.isAdmin || actor.roles.isManager}
      />
    </div>
  );
}
