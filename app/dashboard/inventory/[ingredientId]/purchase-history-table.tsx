"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { usePurchaseHistoryTableController } from "./_components/use-purchase-history-table";
import type { PurchaseHistoryEntry } from "@/features/inventory/store-ingredients/types";
import type { PurchaseHistoryMeta } from "@/features/inventory/store-ingredients/client";

type SupplierOption = {
  id: string;
  name: string;
};

type PurchaseHistoryTableProps = {
  ingredientId: string;
  suppliers: SupplierOption[];
  initialHistory: {
    items: PurchaseHistoryEntry[];
    meta: PurchaseHistoryMeta;
  };
};

export function PurchaseHistoryTable({
  ingredientId,
  suppliers,
  initialHistory,
}: PurchaseHistoryTableProps) {
  const controller = usePurchaseHistoryTableController({
    ingredientId,
    suppliers,
    initialHistory,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Purchase History</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <DataTable
          columns={controller.columns}
          initialFilters={controller.initialFilters}
          initialData={controller.initialData}
          queryHook={controller.queryHook}
          getRowId={controller.getRowId}
          loadingMessage="Loading purchase history..."
          emptyMessage="No purchase records for this ingredient."
          renderToolbar={(context) => (
            <DataTableToolbar {...controller.buildToolbarConfig(context)} />
          )}
        />
      </CardContent>
    </Card>
  );
}
