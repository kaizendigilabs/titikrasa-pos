'use client';

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { InviteUserDialog, EditUserDialog } from "./_components/forms";
import {
  BulkDeleteDialog,
  DeleteUserDialog,
  ToggleStatusDialog,
} from "./_components/dialogs";
import {
  useUsersTableController,
  type UseUsersTableControllerArgs,
} from "./_components/use-users-table";

export type UsersTableProps = UseUsersTableControllerArgs;

export function UsersTable(props: UsersTableProps) {
  const controller = useUsersTableController(props);

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Loading users..."
      emptyMessage="No users found."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAfterTable={() => (
        <>
          {props.canManage ? (
            <>
              <InviteUserDialog {...controller.inviteSheetProps} />
              <EditUserDialog {...controller.editSheetProps} />
            </>
          ) : null}
          <ToggleStatusDialog {...controller.dialogs.toggle} />
          <DeleteUserDialog {...controller.dialogs.delete} />
          <BulkDeleteDialog {...controller.dialogs.bulkDelete} />
        </>
      )}
    />
  );
}
