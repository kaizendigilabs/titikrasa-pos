'use client';

import * as React from "react";

import { DataTableContent } from "./data-table-content";
import { DataTablePagination } from "./data-table-pagination";
import {
  useDataTableState,
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
  type UseDataTableStateOptions,
  type UseDataTableStateResult,
} from "./use-data-table-state";

export type DataTableRenderContext<
  TData,
  TFilters extends PaginationFilters,
> = UseDataTableStateResult<TData, TFilters>;

export type DataTableProps<TData, TFilters extends PaginationFilters> = Omit<
  UseDataTableStateOptions<TData, TFilters>,
  "columns" | "queryHook" | "initialFilters"
> & {
  columns: UseDataTableStateOptions<TData, TFilters>["columns"];
  queryHook: DataTableQueryHook<TData, TFilters>;
  initialFilters: TFilters;
  loadingMessage?: string;
  emptyMessage?: string;
  renderToolbar?: (context: DataTableRenderContext<TData, TFilters>) => React.ReactNode;
  renderAboveTable?: (
    context: DataTableRenderContext<TData, TFilters>,
  ) => React.ReactNode;
  renderFooter?: (
    context: DataTableRenderContext<TData, TFilters>,
  ) => React.ReactNode;
  renderAfterTable?: (
    context: DataTableRenderContext<TData, TFilters>,
  ) => React.ReactNode;
};

export function DataTable<TData, TFilters extends PaginationFilters>({
  columns,
  queryHook,
  initialFilters,
  initialData,
  getRowId,
  loadingMessage = "Loading...",
  emptyMessage = "No results.",
  renderToolbar,
  renderAboveTable,
  renderFooter,
  renderAfterTable,
}: DataTableProps<TData, TFilters>) {
  const context = useDataTableState<TData, TFilters>({
    columns,
    initialFilters,
    queryHook,
    initialData,
    getRowId,
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        {renderToolbar ? renderToolbar(context) : null}

        <div className="px-4 lg:px-6">
          {renderAboveTable ? (
            <div className="mb-2">{renderAboveTable(context)}</div>
          ) : null}

          <div className="overflow-hidden rounded-md border">
            <DataTableContent
              table={context.table}
              isLoading={context.isInitialLoading}
              loadingMessage={loadingMessage}
              emptyMessage={emptyMessage}
            />
          </div>

          <div className="mt-4">
            {renderFooter ? (
              renderFooter(context)
            ) : (
              <DataTablePagination
                table={context.table}
                totalRows={context.totalItems}
                isSyncing={context.isSyncing}
              />
            )}
          </div>
        </div>
      </div>

      {renderAfterTable ? renderAfterTable(context) : null}
    </div>
  );
}
