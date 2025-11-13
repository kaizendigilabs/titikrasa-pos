import { redirect } from "next/navigation";

import { PurchaseHistoryTable } from "./purchase-history-table";
import {
  getStoreIngredientDetailBootstrap,
} from "@/features/inventory/store-ingredients/server";
import { requireActor } from "@/features/users/server";
import {
  SummaryHeader,
  InventorySnapshotCard,
  LatestPurchaseCard,
  LinkedSuppliersCard,
} from "./_components/summary";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 25;

export default async function StoreIngredientDetailPage({
  params,
}: {
  params: Promise<{ ingredientId: string }>;
}) {
  const actor = await requireActor();
  const { ingredientId } = await params;

  if (!ingredientId) {
    redirect("/dashboard/inventory");
  }

  let detail;
  let bootstrap;

  try {
    bootstrap = await getStoreIngredientDetailBootstrap(actor, ingredientId, {
      historyPageSize: DEFAULT_PAGE_SIZE,
    });
    detail = bootstrap.detail;
  } catch (error) {
    console.error("[INVENTORY_DETAIL_ERROR]", error);
    redirect("/dashboard/inventory");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
      <SummaryHeader name={detail.name} isActive={detail.isActive} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InventorySnapshotCard
          sku={detail.sku}
          baseUom={detail.baseUom}
          minStock={detail.minStock}
          currentStock={detail.currentStock}
          avgCost={detail.avgCost}
        />
        <LatestPurchaseCard
          supplierId={detail.lastSupplierId}
          supplierName={detail.lastSupplierName}
          price={detail.lastPurchasePrice}
          purchasedAt={detail.lastPurchaseAt}
          createdAt={detail.createdAt}
        />
        <LinkedSuppliersCard suppliers={bootstrap.suppliers} />
      </div>

      <PurchaseHistoryTable
        ingredientId={ingredientId}
        suppliers={bootstrap.suppliers}
        initialHistory={bootstrap.history}
      />
    </div>
  );
}
