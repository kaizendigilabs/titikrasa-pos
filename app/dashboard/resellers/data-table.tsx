"use client";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";

import { InviteResellerDialog, EditResellerDialog } from "./_components/forms";
import {
  BulkDeleteDialog,
  DeleteResellerDialog,
  ToggleStatusDialog,
} from "./_components/dialogs";
import {
  useResellersTableController,
  type UseResellersTableControllerArgs,
} from "./_components/use-resellers-table";

export type ResellersTableProps = UseResellersTableControllerArgs;

export function ResellersTable(props: ResellersTableProps) {
  const controller = useResellersTableController(props);

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Loading resellers..."
      emptyMessage="No resellers found."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAfterTable={() => (
        <>
          {props.canManage ? (
            <>
              <InviteResellerDialog {...controller.inviteSheetProps} />
              <EditResellerDialog {...controller.editSheetProps} />
            </>
          ) : null}
          <ToggleStatusDialog {...controller.dialogs.toggle} />
          <DeleteResellerDialog {...controller.dialogs.delete} />
          <BulkDeleteDialog {...controller.dialogs.bulkDelete} />
        </>
      )}
    />
  );
}
