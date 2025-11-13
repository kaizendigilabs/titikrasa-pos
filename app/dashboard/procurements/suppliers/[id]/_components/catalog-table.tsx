"use client";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";

import {
  useSupplierCatalogTableController,
  type UseSupplierCatalogTableArgs,
} from "./use-supplier-catalog-table";
import { CatalogItemSheet } from "./catalog-item-sheet";
import { CatalogItemEditSheet } from "./catalog-item-edit-sheet";
import { CatalogItemDeleteDialog } from "./catalog-item-delete-dialog";

export type SupplierCatalogTableProps = UseSupplierCatalogTableArgs;

export function SupplierCatalogTable(props: SupplierCatalogTableProps) {
  const controller = useSupplierCatalogTableController(props);

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Memuat katalog supplier..."
      emptyMessage="Supplier ini belum memiliki katalog."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAfterTable={() =>
        props.canManage ? (
          <>
            {controller.createSheetProps ? (
              <CatalogItemSheet
                supplierId={props.supplierId}
                {...controller.createSheetProps}
              />
            ) : null}
            {controller.editSheetProps ? (
              <CatalogItemEditSheet {...controller.editSheetProps} />
            ) : null}
            {controller.deleteDialogProps ? (
              <CatalogItemDeleteDialog {...controller.deleteDialogProps} />
            ) : null}
          </>
        ) : null
      }
    />
  );
}
