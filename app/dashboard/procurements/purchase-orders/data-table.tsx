"use client";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";

import { PurchaseOrderCreateSheet } from "./_components/forms";
import {
  PurchaseOrderDeleteDialog,
  PurchaseOrderDetailDialog,
} from "./_components/dialogs";
import {
  usePurchaseOrdersTableController,
  type UsePurchaseOrdersTableControllerArgs,
} from "./_components/use-purchase-orders-table";

export type PurchaseOrdersTableProps = UsePurchaseOrdersTableControllerArgs;

export function PurchaseOrdersTable(props: PurchaseOrdersTableProps) {
  const controller = usePurchaseOrdersTableController(props);

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Loading purchase orders..."
      emptyMessage="No purchase orders found."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAfterTable={() => (
        <>
          {controller.createSheetProps ? (
            <PurchaseOrderCreateSheet {...controller.createSheetProps} />
          ) : null}
          <PurchaseOrderDetailDialog {...controller.detailDialogProps} />
          <PurchaseOrderDeleteDialog {...controller.deleteDialogProps} />
        </>
      )}
    />
  );
}
