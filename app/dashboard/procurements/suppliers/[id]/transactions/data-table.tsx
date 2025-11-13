"use client";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";
import type { SupplierOrder } from "@/features/procurements/suppliers/types";

import {
  SupplierTransactionsEmptyState,
  SupplierTransactionsSkeleton,
} from "./_components/empty-state";
import { useSupplierTransactionsTable } from "./_components/use-transactions-table";

export type SupplierTransactionsTableProps = {
  supplierId: string;
  initialData: DataTableQueryResult<SupplierOrder>;
};

export function SupplierTransactionsTable({ supplierId, initialData }: SupplierTransactionsTableProps) {
  const controller = useSupplierTransactionsTable({ supplierId, initialData });

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      initialData={controller.initialData}
      queryHook={controller.queryHook}
      getRowId={controller.getRowId}
      loadingMessage="Loading transactions..."
      emptyMessage="Belum ada transaksi untuk supplier ini."
      renderToolbar={(context) => (
        <DataTableToolbar {...controller.buildToolbarConfig(context)} />
      )}
      renderAboveTable={(context) => {
        if (context.isInitialLoading) {
          return <SupplierTransactionsSkeleton />;
        }
        if (context.totalItems === 0) {
          return <SupplierTransactionsEmptyState supplierId={supplierId} />;
        }
        return null;
      }}
    />
  );
}
