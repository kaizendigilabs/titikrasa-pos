"use client";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { StoreIngredientEditDialog } from "./_components/edit-sheet";
import {
  useStoreIngredientsTableController,
  type UseStoreIngredientsTableControllerArgs,
} from "./_components/use-store-ingredients-table";

export type StoreIngredientsTableProps = UseStoreIngredientsTableControllerArgs;

export function StoreIngredientsTable(props: StoreIngredientsTableProps) {
  const controller = useStoreIngredientsTableController(props);

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Loading ingredients..."
      emptyMessage="No ingredients match the selected filters."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAfterTable={() =>
        controller.editDialogProps ? (
          <StoreIngredientEditDialog {...controller.editDialogProps} />
        ) : null
      }
    />
  );
}
