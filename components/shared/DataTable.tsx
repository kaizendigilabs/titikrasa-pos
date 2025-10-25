"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  useReactTable,
  Table as TanTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * ---------------------------------------------------------------------------
 * Reusable DataTable (TanStack v8 + shadcn/ui)
 * - Basic Table
 * - Sorting
 * - Filtering (text for any column)
 * - Row Selection
 * - Row Actions (menu per row)
 * - Pagination with arrows + numbers
 * - No column-visibility controls included
 * ---------------------------------------------------------------------------
 * Usage example (client component):
 *
 *  const columns: ColumnDef<User>[] = [
 *    DataTable.columns.selection(),
 *    { accessorKey: "name", header: DataTable.columns.sortableHeader("Name") },
 *    { accessorKey: "email", header: DataTable.columns.sortableHeader("Email") },
 *    {
 *      id: "actions",
 *      header: "",
 *      cell: ({ row }) => (
 *        <RowActions
 *          onView={() => console.log("view", row.original)}
 *          onEdit={() => console.log("edit", row.original)}
 *          onDelete={() => console.log("delete", row.original)}
 *        />
 *      ),
 *      enableSorting: false,
 *      enableHiding: false,
 *    },
 *  ];
 *
 *  <DataTable
 *    data={users}
 *    columns={columns}
 *    filterColumnId="name" // which column the search box targets
 *    pageSize={10}
 *  />
 */

// -- Row Actions --------------------------------------------------------------
export function RowActions(props: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}) {
  const { onView, onEdit, onDelete, disabled } = props;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {onView && (
          <DropdownMenuItem onClick={onView} disabled={disabled}>
            View
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit} disabled={disabled}>
            Edit
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} disabled={disabled} className="text-destructive">
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// -- Pagination (arrows + numbers) -------------------------------------------
function Paginator({ table, className }: { table: TanTable<any>; className?: string }) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  // Build a short page number list: 1 … n-1 n with neighbors
  const pages = React.useMemo(() => {
    const total = pageCount;
    const current = pageIndex + 1;
    const window = 1; // neighbors on each side
    const nums: (number | "dots")[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) nums.push(i);
      return nums;
    }
    const add = (n: number) => nums.push(n);
    const addDots = () => nums.push("dots");

    add(1);
    if (current > 2 + window) addDots();
    const start = Math.max(2, current - window);
    const end = Math.min(total - 1, current + window);
    for (let i = start; i <= end; i++) add(i);
    if (current < total - (1 + window)) addDots();
    add(total);

    return nums;
  }, [pageIndex, pageCount]);

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="text-sm text-muted-foreground">
        Page <span className="font-medium">{pageIndex + 1}</span> of {pageCount || 1}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === "dots" ? (
            <span key={`dots-${i}`} className="px-2 text-muted-foreground select-none">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p - 1 === pageIndex ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-[2rem]"
              onClick={() => table.setPageIndex(p - 1)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// -- Toolbar (text filter + bulk actions slot) --------------------------------
function DataTableToolbar<TData>({
  table,
  filterColumnId,
  placeholder = "Filter...",
  children,
}: {
  table: TanTable<TData>;
  filterColumnId?: string;
  placeholder?: string;
  children?: React.ReactNode; // extra controls (facets, export, etc.)
}) {
  const column = filterColumnId ? table.getColumn(filterColumnId) : undefined;
  const value = (column?.getFilterValue() as string) ?? "";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        {column && (
          <Input
            className="h-9 w-60"
            placeholder={placeholder}
            value={value}
            onChange={(e) => column.setFilterValue(e.target.value)}
          />
        )}
        {value && (
          <Button variant="ghost" size="sm" onClick={() => column?.setFilterValue("")}>Clear</Button>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

// -- Helper: selection checkbox column ---------------------------------------
function SelectionHeader<TData>({ table }: { table: TanTable<TData> }) {
  return (
    <Checkbox
      checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
      onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
      aria-label="Select all"
    />
  );
}

function SelectionCell<TData>({ row }: { row: any }) {
  return (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(v) => row.toggleSelected(!!v)}
      aria-label="Select row"
    />
  );
}

// -- Main DataTable -----------------------------------------------------------
export type DataTableProps<TData, TValue> = {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  pageSize?: number;
  /** Which column the toolbar text input should filter. If omitted, toolbar hides the input */
  filterColumnId?: string;
  /** Optional extra toolbar controls (e.g., facet filters, export, create button) */
  toolbarChildren?: React.ReactNode;
  /** Optional className for wrapper */
  className?: string;
  /** Controlled pagination (server-side): provide total rows & onPaginationChange */
  rowCount?: number; // if provided, pageCount = Math.ceil(rowCount/pageSize)
  onPaginationChange?: (updater: { pageIndex: number; pageSize: number }) => void;
};

export function DataTable<TData, TValue>({
  data,
  columns,
  pageSize = 10,
  filterColumnId,
  toolbarChildren,
  className,
  rowCount,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, rowSelection, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      // Sync local state
      const next = typeof updater === "function" ? updater(pagination) : updater;
      setPagination(next);
      // Bubble up for server-side control if requested
      onPaginationChange?.(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !!rowCount, // if rowCount provided, treat as server-paginated
    pageCount: rowCount ? Math.max(1, Math.ceil(rowCount / pagination.pageSize)) : undefined,
    autoResetPageIndex: false,
  });

  React.useEffect(() => {
    // keep local pageSize in sync with prop
    setPagination((p) => (p.pageSize === pageSize ? p : { ...p, pageSize }));
  }, [pageSize]);

  return (
    <div className={cn("w-full space-y-3", className)}>
      <DataTableToolbar table={table} filterColumnId={filterColumnId}>
        {toolbarChildren}
      </DataTableToolbar>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          header.column.getCanSort() && "cursor-pointer select-none",
                          "flex items-center gap-1"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Paginator table={table} />
    </div>
  );
}

// -- Convenience helpers for columns -----------------------------------------
export const DataTableHelpers = {
  /** Selection column to prepend to your columns array */
  selection<TData>(): ColumnDef<TData> {
    return {
      id: "select",
      header: ({ table }) => <SelectionHeader table={table} />,
      cell: ({ row }) => <SelectionCell row={row} />,
      enableSorting: false,
      enableHiding: false,
      size: 32,
    } as ColumnDef<TData>;
  },

  /**
   * Sortable header renderer: `header: DataTableHelpers.sortableHeader("Title")`
   */
  sortableHeader(label: React.ReactNode) {
    return () => <span className="font-medium">{label}</span>;
  },
};

// -- Example Types & Columns Snippet (remove in prod) -------------------------
// type User = { id: string; name: string; email: string; role: string };
// export const userColumns: ColumnDef<User>[] = [
//   DataTableHelpers.selection<User>(),
//   { accessorKey: "name", header: DataTableHelpers.sortableHeader("Name") },
//   { accessorKey: "email", header: DataTableHelpers.sortableHeader("Email") },
//   {
//     accessorKey: "role",
//     header: DataTableHelpers.sortableHeader("Role"),
//     cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span>,
//   },
//   {
//     id: "actions",
//     header: "",
//     cell: ({ row }) => (
//       <RowActions
//         onView={() => console.log("view", row.original)}
//         onEdit={() => console.log("edit", row.original)}
//         onDelete={() => console.log("delete", row.original)}
//       />
//     ),
//     enableSorting: false,
//     enableHiding: false,
//   },
// ];

// export function UsersTable({ users }: { users: User[] }) {
//   return (
//     <DataTable
//       data={users}
//       columns={userColumns}
//       filterColumnId="name"
//       pageSize={10}
//       toolbarChildren={<Button size="sm">Add user</Button>}
//     />
//   );
// }
