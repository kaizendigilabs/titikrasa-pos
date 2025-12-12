'use client';

import { DataTable } from '@/components/tables/data-table';
import { DataTableToolbar } from '@/components/tables/data-table-toolbar';

import { CategoryFormDialog } from './_components/forms';
import {
  DeleteCategoryDialog,
  ToggleStatusDialog,
} from './_components/dialogs';
import {
  useMenuCategoriesTableController,
  type UseMenuCategoriesTableControllerArgs,
} from './_components/use-menu-categories-table';

export type MenuCategoriesTableProps = UseMenuCategoriesTableControllerArgs;

export function MenuCategoriesTable(props: MenuCategoriesTableProps) {
  const controller = useMenuCategoriesTableController(props);

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Memuat kategori..."
      emptyMessage="Belum ada kategori."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAfterTable={() => (
        <>
          {props.canManage ? (
            <CategoryFormDialog {...controller.formDialogProps} />
          ) : null}
          <ToggleStatusDialog {...controller.dialogs.toggle} />
          <DeleteCategoryDialog {...controller.dialogs.delete} />
        </>
      )}
    />
  );
}
