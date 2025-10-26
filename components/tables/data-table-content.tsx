import {
  Table as TableContent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { flexRender, type Table } from "@tanstack/react-table";

type DataTableContentProps<TData> = {
  table: Table<TData>;
  isLoading?: boolean;
};

export function DataTableContent<TData>({
  table,
  isLoading = false,
}: DataTableContentProps<TData>) {
  const columnCount = table.getAllLeafColumns().length;

  return (
    <TableContent>
      {/* Table Content - Header */}
      <TableHeader className="bg-muted">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>

      {/* Table Content - Body */}
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="h-24 text-center">
              Loading users...
            </TableCell>
          </TableRow>
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columnCount} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </TableContent>
  );
}
