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

type UseFinanceTableControllerProps = {
  startDate: Date | null;
  endDate: Date | null;
};

export function useFinanceTableController({ startDate, endDate }: UseFinanceTableControllerProps = { startDate: null, endDate: null }) {
  const initialFilters = React.useMemo<FinanceTableFilters>(
    () => ({
      page: 1,
      pageSize: 10,
      type: "all",
      categoryId: null,
      search: "",
      startDate,
      endDate,
    }),
    [startDate, endDate]
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
        ],
        reset: {
          onReset: () => context.updateFilters(() => initialFilters),
          visible:
            context.filters.search !== "" ||
            context.filters.type !== "all" ||
            context.filters.categoryId !== null,
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
