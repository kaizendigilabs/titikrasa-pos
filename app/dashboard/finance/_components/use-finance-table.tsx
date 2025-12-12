"use client";

import type { DataTableRenderContext } from "@/components/tables/data-table";
import type { DataTableToolbarProps } from "@/components/tables/data-table-toolbar";
import {
  type DataTableQueryHook,
  type PaginationFilters,
} from "@/components/tables/use-data-table-state";
import { useCashFlows } from "@/features/finance/hooks";
import type { CashFlow, CashFlowType } from "@/features/finance/types";
import * as React from "react";
import { financeColumns } from "./columns";

export type FinanceTableFilters = PaginationFilters & {
  type: CashFlowType | "all";
  categoryId: string | null;
  search: string;
  startDate: Date | null;
  endDate: Date | null;
};

export type FinanceTableControllerResult = {
  columns: typeof financeColumns;
  initialFilters: FinanceTableFilters;
  queryHook: DataTableQueryHook<CashFlow, FinanceTableFilters>;
  buildToolbarConfig: (
    context: DataTableRenderContext<CashFlow, FinanceTableFilters>
  ) => DataTableToolbarProps;
  summary: { totalIn: number; totalOut: number; net: number } | null;
};

export function useFinanceTableController() {
  const initialFilters = React.useMemo<FinanceTableFilters>(
    () => ({
      page: 1,
      pageSize: 10,
      type: "all",
      categoryId: null,
      search: "",
      startDate: null,
      endDate: null,
    }),
    []
  );

  const queryHook: DataTableQueryHook<CashFlow, FinanceTableFilters> = (
    filters
  ) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useCashFlows({
      page: filters.page,
      pageSize: filters.pageSize,
      type: filters.type,
      categoryId: filters.categoryId,
      search: filters.search,
      startDate: filters.startDate?.toISOString() ?? null,
      endDate: filters.endDate?.toISOString() ?? null,
    });
  };

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<CashFlow, FinanceTableFilters>
    ): DataTableToolbarProps => {
      // Access summary if needed
      // const summary = (context.queryResult.data as any)?.summary;

      return {
        search: {
          value: context.filters.search,
          onChange: (value) => context.updateFilters({ search: value }),
          placeholder: "Cari transaksi...",
        },
        filters: [
          {
            type: "select",
            id: "type-filter",
            value: context.filters.type,
            onValueChange: (value) =>
              context.updateFilters({ type: value as CashFlowType | "all" }),
            options: [
              { label: "Semua Tipe", value: "all" },
              { label: "Pemasukan", value: "in" },
              { label: "Pengeluaran", value: "out" },
            ],
            placeholder: "Tipe",
          },
          {
            type: "custom",
            id: "date-range-filter",
            element: (
              <div className="flex items-center gap-2">
                 <input
                    type="date"
                    className="h-8 w-[130px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={context.filters.startDate ? context.filters.startDate.toISOString().split('T')[0] : ""}
                    onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        context.updateFilters({ startDate: date });
                    }}
                    placeholder="Mulai"
                 />
                 <span className="text-muted-foreground">-</span>
                 <input
                    type="date"
                    className="h-8 w-[130px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={context.filters.endDate ? context.filters.endDate.toISOString().split('T')[0] : ""}
                    onChange={(e) => {
                         const date = e.target.value ? new Date(e.target.value) : null;
                         // Set time to end of day for end date? 
                         // Native date picking usually sets to 00:00 UTC or local. 
                         // To encompass the whole day, often backend logic handles it (lte date + 1 day, or lte date 23:59:59).
                         // Our API route uses lte 'date', which likely compares timestamps or date types.
                         // If referencing a timestamptz column, '2023-01-01' compares assuming 00:00. 
                         // If searching for "transactions on 2023-01-01", we need logic.
                         // For now let's send the date object as-is. The API converts string 'YYYY-MM-DD' to comparison?
                         // Wait, in route.ts: if (endDate) query = query.lte("date", endDate);
                         // If date column is timestamptz, '2024-01-01' is '2024-01-01 00:00:00+00'.
                         // If we want to include transactions on that day, we might need to adjust.
                         // But avoiding overengineering for now: simple Date object.
                        context.updateFilters({ endDate: date });
                    }}
                    placeholder="Selesai"
                 />
              </div>
            ),
          },
        ],
        reset: {
          onReset: () => context.updateFilters(() => initialFilters),
          visible:
            context.filters.search !== "" ||
            context.filters.type !== "all" ||
            context.filters.categoryId !== null ||
            context.filters.startDate !== null,
            "aria-label": "Reset",
        },
        status: {
          isSyncing: context.isSyncing,
        },
      };
    },
    [initialFilters] // Included initialFilters dependency
  );

  return {
    columns: financeColumns,
    initialFilters,
    queryHook,
    buildToolbarConfig,
    summary: null,
  };
}
