import { Table } from "@tanstack/react-table";
import { IconLoader2 } from "@tabler/icons-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalRows?: number;
  isSyncing?: boolean;
}

export function DataTablePagination<TData>({
  table,
  totalRows,
  isSyncing = false,
}: DataTablePaginationProps<TData>) {
  const pageIndex = table.getState().pagination?.pageIndex ?? 0;
  const pageCount = table.getPageCount();
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const visibleRows = table.getFilteredRowModel().rows.length;
  const resolvedTotalRows =
    typeof totalRows === "number" ? totalRows : visibleRows;

  return (
    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        Total {resolvedTotalRows} row(s) · Selected {selectedCount}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex">
          <span className="text-sm">
            {pageCount === 0 ? 0 : pageIndex + 1} of {Math.max(pageCount, 1)}
          </span>
          {isSyncing ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <IconLoader2 className="size-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
