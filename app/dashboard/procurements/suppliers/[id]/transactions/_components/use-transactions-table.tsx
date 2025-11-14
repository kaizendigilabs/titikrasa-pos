"use client";

import * as React from "react";

import type { DataTableRenderContext } from "@/components/tables/data-table";
import {
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
  useDataTableState,
} from "@/components/tables/use-data-table-state";
import type { DataTableToolbarProps } from "@/components/tables/data-table-toolbar";
import { createSupplierTransactionColumns } from "../columns";
import { useSupplierOrders } from "@/features/procurements/suppliers/hooks";
import type { SupplierOrderFilters } from "@/features/procurements/suppliers/schemas";
import type { SupplierOrder } from "@/features/procurements/suppliers/types";

export type SupplierTransactionsFilters = PaginationFilters & {
  status: "all" | "draft" | "pending" | "complete";
  search: string;
  supplierId: string;
};

export type UseSupplierTransactionsArgs = {
  supplierId: string;
  initialData: DataTableQueryResult<SupplierOrder>;
};

export function useSupplierTransactionsTable({
  supplierId,
  initialData,
}: UseSupplierTransactionsArgs) {
  const initialFilters = React.useMemo<SupplierTransactionsFilters>(
    () => ({
      page: initialData.meta?.pagination?.page ?? 1,
      pageSize: initialData.meta?.pagination?.pageSize ?? 10,
      status: ((initialData.meta?.filters as any)?.status ?? "all") as SupplierTransactionsFilters["status"],
      search: ((initialData.meta?.filters as any)?.search as string | null) ?? "",
      supplierId,
    }),
    [initialData, supplierId],
  );

  const columns = React.useMemo(() => createSupplierTransactionColumns(), []);

  const controller = useDataTableState<SupplierOrder, SupplierTransactionsFilters>({
    columns,
    initialFilters,
    queryHook: useSupplierTransactionsDataTableQuery,
    initialData,
    getRowId: (row) => row.id,
  });

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<SupplierOrder, SupplierTransactionsFilters>,
    ): DataTableToolbarProps => {
      const showReset =
        context.filters.search.trim().length > 0 ||
        context.filters.status !== "all";

      return {
        search: {
          value: context.filters.search,
          onChange: (value) => context.updateFilters({ search: value }),
          placeholder: "Search PO ID",
          disabled: context.isSyncing,
        },
        filters: [
          {
            type: "select",
            id: "status",
            value: context.filters.status,
            onValueChange: (value) =>
              context.updateFilters({
                status: (value ?? "all") as SupplierTransactionsFilters["status"],
              }),
            options: [
              { label: "All Status", value: "all" },
              { label: "Draft", value: "draft" },
              { label: "Pending", value: "pending" },
              { label: "Complete", value: "complete" },
            ],
            placeholder: "Status",
            disabled: context.isSyncing,
          },
        ],
        reset: {
          visible: showReset,
          onReset: () =>
            context.updateFilters(
              () => ({
                ...context.filters,
                search: "",
                status: "all",
              }),
              { resetPage: true },
            ),
          disabled: context.isSyncing,
        },
        status: {
          isSyncing: context.isSyncing,
        },
      };
    },
    [],
  );

  return {
    columns,
    initialFilters,
    initialData,
    queryHook: useSupplierTransactionsDataTableQuery,
    getRowId: (row: SupplierOrder) => row.id,
    buildToolbarConfig,
  };
}

export function useSupplierTransactionsDataTableQuery(
  filters: SupplierTransactionsFilters,
  options?: { initialData?: DataTableQueryResult<SupplierOrder> },
) {
  const normalizedStatus = filters.status ?? "all";
  const trimmedSearch = filters.search.trim();
  const queryFilters: SupplierOrderFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
    status: normalizedStatus,
    ...(trimmedSearch.length > 0 ? { search: trimmedSearch } : {}),
  };

  const hookOptions = options?.initialData
    ? {
        initialData: {
          items: options.initialData.items,
          meta: options.initialData.meta ?? null,
        },
      }
    : undefined;

  return useSupplierOrders(filters.supplierId, queryFilters, hookOptions);
}
