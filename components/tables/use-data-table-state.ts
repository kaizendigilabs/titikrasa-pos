import * as React from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type Row,
  type SortingState,
  type Table,
  useReactTable,
} from "@tanstack/react-table";
import type { UseQueryResult } from "@tanstack/react-query";

export type PaginationFilters = {
  page: number;
  pageSize: number;
};

export type DataTableQueryMeta = {
  pagination?: {
    total?: number;
  };
  [key: string]: unknown;
};

export type DataTableQueryResult<TData> = {
  items: TData[];
  meta?: DataTableQueryMeta | null;
};

export type DataTableQueryHook<TData, TFilters extends PaginationFilters> = (
  filters: TFilters,
  options?: { initialData?: DataTableQueryResult<TData> },
) => UseQueryResult<DataTableQueryResult<TData>>;

export type UseDataTableStateOptions<TData, TFilters extends PaginationFilters> = {
  columns: ColumnDef<TData, unknown>[];
  initialFilters: TFilters;
  queryHook: DataTableQueryHook<TData, TFilters>;
  initialData?: DataTableQueryResult<TData>;
  getRowId?: (row: TData, index: number, parent?: Row<TData>) => string;
};

export type UseDataTableStateResult<TData, TFilters extends PaginationFilters> = {
  table: Table<TData>;
  filters: TFilters;
  setFilters: React.Dispatch<React.SetStateAction<TFilters>>;
  updateFilters: (
    updater: Partial<TFilters> | ((prev: TFilters) => TFilters | Partial<TFilters>),
    options?: { resetPage?: boolean },
  ) => void;
  queryResult: UseQueryResult<DataTableQueryResult<TData>>;
  totalItems: number;
  selectedRows: TData[];
  clearRowSelection: () => void;
  isInitialLoading: boolean;
  isSyncing: boolean;
};

export function useDataTableState<TData, TFilters extends PaginationFilters>({
  columns,
  initialFilters,
  queryHook,
  initialData,
  getRowId,
}: UseDataTableStateOptions<TData, TFilters>): UseDataTableStateResult<
  TData,
  TFilters
> {
  const [filters, setFilters] = React.useState<TFilters>(initialFilters);
  const initialFiltersRef = React.useRef(initialFilters);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>(
    {},
  );

  React.useEffect(() => {
    initialFiltersRef.current = initialFilters;
  }, [initialFilters]);

  const shouldUseInitialData = React.useMemo(() => {
    if (!initialData) return false;
    return shallowEqualFilters(
      filters as Record<string, unknown>,
      initialFiltersRef.current as Record<string, unknown>,
    );
  }, [filters, initialData]);

  const queryResult = queryHook(filters, {
    ...(shouldUseInitialData ? { initialData } : {}),
  });

  const items =
    queryResult.data?.items ?? initialData?.items ?? [];
  const totalItems =
    queryResult.data?.meta?.pagination?.total ??
    initialData?.meta?.pagination?.total ??
    items.length;

  const pageCount = Math.max(
    1,
    Math.ceil(Math.max(totalItems, 1) / filters.pageSize),
  );

  const paginationState: PaginationState = React.useMemo(
    () => ({
      pageIndex: Math.max(filters.page, 1) - 1,
      pageSize: filters.pageSize,
    }),
    [filters.page, filters.pageSize],
  );

  const table = useReactTable({
    data: items,
    columns,
    pageCount,
    manualPagination: true,
    state: {
      sorting,
      rowSelection,
      pagination: paginationState,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      setFilters((prev) => {
        const next =
          typeof updater === "function"
            ? updater({
                pageIndex: Math.max(prev.page, 1) - 1,
                pageSize: prev.pageSize,
              })
            : updater;
        return {
          ...prev,
          page: next.pageIndex + 1,
          pageSize: next.pageSize,
        };
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  const updateFilters = React.useCallback(
    (
      updater: Partial<TFilters> | ((prev: TFilters) => TFilters | Partial<TFilters>),
      options?: { resetPage?: boolean },
    ) => {
      setFilters((prev) => {
        const result = typeof updater === "function" ? updater(prev) : updater;
        const next = { ...prev, ...result };
        return options?.resetPage === false ? next : { ...next, page: 1 };
      });
    },
    [],
  );

  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);

  const isInitialLoading = queryResult.status === "pending" && !queryResult.data;
  const isSyncing = queryResult.isFetching;
  const clearRowSelection = React.useCallback(() => {
    setRowSelection({});
  }, []);

  return {
    table,
    filters,
    setFilters,
    updateFilters,
    queryResult,
    totalItems,
    selectedRows,
    clearRowSelection,
    isInitialLoading,
    isSyncing,
  };
}

function shallowEqualFilters(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}
