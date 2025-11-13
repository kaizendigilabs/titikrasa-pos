"use client";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";

import {
  InviteSupplierSheet,
  EditSupplierSheet,
} from "./_components/forms";
import {
  BulkDeleteDialog,
  DeleteSupplierDialog,
  ToggleStatusDialog,
} from "./_components/dialogs";
import {
  useSuppliersTableController,
  type UseSuppliersTableControllerArgs,
} from "./_components/use-suppliers-table";

export type SuppliersTableProps = UseSuppliersTableControllerArgs;

export function SuppliersTable(props: SuppliersTableProps) {
  const controller = useSuppliersTableController(props);

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Loading suppliers..."
      emptyMessage="No suppliers found."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAfterTable={() => (
        <>
          {props.canManage ? (
            <>
              <InviteSupplierSheet {...controller.inviteSheetProps} />
              <EditSupplierSheet {...controller.editSheetProps} />
            </>
          ) : null}
          <ToggleStatusDialog {...controller.dialogs.toggle} />
          <DeleteSupplierDialog {...controller.dialogs.delete} />
          <BulkDeleteDialog {...controller.dialogs.bulkDelete} />
        </>
      )}
    />
  );
}
