"use client";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { useFinanceTableController } from "./use-finance-table";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { ManageCategoriesDialog } from "./manage-categories-dialog";
import { getDateRange, type DateRangeType } from "@/lib/utils/date-helpers";
import * as React from "react";

export type FinanceTableProps = {
    range: DateRangeType;
}

export function FinanceTable({ range }: FinanceTableProps) {
  const { start, end } = React.useMemo(() => getDateRange(range), [range]);
  
  // Use a modified hook or pass filters directly?
  // Since useFinanceTableController manages its own state, we need to pass initialFilters with the date range.
  // But initialFilters is only used ONCE.
  // So we rely on the parent PASSING a new 'key' when range changes.
  
  const controller = useFinanceTableController({
      startDate: start,
      endDate: end
  });

  return (
    <DataTable
      columns={controller.columns}
      initialFilters={controller.initialFilters}
      queryHook={controller.queryHook}
      getRowId={(row) => row.id}
      loadingMessage="Memuat data keuangan..."
      emptyMessage="Belum ada transaksi."
      renderToolbar={(context) => {
        return (
          <div className="space-y-4">            
            <DataTableToolbar 
              {...controller.buildToolbarConfig(context)} 
              primaryAction={<AddTransactionDialog />}
              secondaryActions={<ManageCategoriesDialog />}
            />
          </div>
        );
      }}
    />
  );
}
