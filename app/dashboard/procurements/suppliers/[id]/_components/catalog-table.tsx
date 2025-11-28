"use client";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";

import {
  useSupplierCatalogTableController,
  type UseSupplierCatalogTableArgs,
} from "./use-supplier-catalog-table";
import { CatalogItemDialog } from "./catalog-item-dialog";
import { CatalogItemEditDialog } from "./catalog-item-edit-dialog";
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
            {controller.createDialogProps ? (
              <CatalogItemDialog
                supplierId={props.supplierId}
                {...controller.createDialogProps}
              />
            ) : null}
            {controller.editDialogProps ? (
              <CatalogItemEditDialog {...controller.editDialogProps} />
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
