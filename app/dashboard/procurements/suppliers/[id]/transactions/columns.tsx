"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import type { SupplierOrder } from "@/features/procurements/suppliers/types";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";

export function createSupplierTransactionColumns(): ColumnDef<SupplierOrder>[] {
  return [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PO" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.original.id.slice(0, 10)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "issuedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Issued" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.issuedAt ? formatDateTime(row.original.issuedAt) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {formatCurrency(row.original.totalAmount / 100)}
        </span>
      ),
    },
  ];
}
