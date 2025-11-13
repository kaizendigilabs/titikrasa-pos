'use client';

import { DataTable } from '@/components/tables/data-table';
import { DataTableToolbar } from '@/components/tables/data-table-toolbar';

import { MenuFormSheet } from './_components/forms';
import {
  ToggleStatusDialog,
  DeleteMenuDialog,
} from './_components/dialogs';
import {
  useMenusTableController,
  MenusRealtimeBridge,
  type UseMenusTableControllerArgs,
} from './_components/use-menus-table';

export type MenusTableProps = UseMenusTableControllerArgs;

export function MenusTable(props: MenusTableProps) {
  const controller = useMenusTableController(props);

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Memuat menu..."
      emptyMessage="Belum ada menu."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAfterTable={(context) => (
        <>
          {props.canManage ? (
            <MenuFormSheet {...controller.formSheetProps} />
          ) : null}
          <ToggleStatusDialog {...controller.dialogs.toggle} />
          <DeleteMenuDialog {...controller.dialogs.delete} />
          <MenusRealtimeBridge filters={context.filters} />
        </>
      )}
    />
  );
}
