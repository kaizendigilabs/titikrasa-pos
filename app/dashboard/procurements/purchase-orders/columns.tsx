'use client';

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import {
  createActionColumn,
  type ActionMenuItem,
} from "@/components/tables/create-action-column";
import type { PurchaseOrderListItem } from "@/features/procurements/purchase-orders/types";
import { formatCurrency } from "@/lib/utils/formatters";

type PurchaseOrderActions = {
  onView: (purchaseOrder: PurchaseOrderListItem) => void;
  onDelete?: (purchaseOrder: PurchaseOrderListItem) => void;
  isRowPending?: (purchaseOrder: PurchaseOrderListItem) => boolean;
  disableDelete?: (purchaseOrder: PurchaseOrderListItem) => boolean;
};

function formatStatus(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "pending":
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
          Pending
        </Badge>
      );
    case "complete":
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
          Complete
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

export function createPurchaseOrderColumns(
  actions?: PurchaseOrderActions,
): ColumnDef<PurchaseOrderListItem>[] {
  const baseColumns: ColumnDef<PurchaseOrderListItem>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PO ID" />
      ),
      cell: ({ row }) =>
        actions?.onView ? (
          <button
            type="button"
            onClick={() => actions.onView(row.original)}
            className="font-mono text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {row.original.id}
          </button>
        ) : (
          <span className="font-mono text-sm text-muted-foreground">
            {row.original.id}
          </span>
        ),
    },
    {
      accessorKey: "supplier_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Supplier" />
      ),
      cell: ({ row }) =>
        actions?.onView ? (
          <button
            type="button"
            onClick={() => actions.onView(row.original)}
            className="text-sm text-left text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {row.original.supplier_name}
          </button>
        ) : (
          <span className="text-sm text-foreground">
            {row.original.supplier_name}
          </span>
        ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => formatStatus(row.original.status),
    },
    {
      accessorKey: "grand_total",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(row.original.grand_total / 100)}
        </span>
      ),
    },
    {
      accessorKey: "issued_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Issued" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.issued_at
            ? new Date(row.original.issued_at).toLocaleString('id-ID')
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: "completed_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Completed" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.completed_at
            ? new Date(row.original.completed_at).toLocaleString('id-ID')
            : '—'}
        </span>
      ),
    },
  ];

  if (!actions) {
    return baseColumns;
  }

  const actionItems: ActionMenuItem<PurchaseOrderListItem>[] = [
    {
      type: "label",
      label: "Purchase Order",
    },
    {
      label: "View detail",
      onSelect: actions.onView,
    },
  ];

  if (actions.onDelete) {
    actionItems.push({ type: "separator" });
    actionItems.push({
      label: "Delete",
      destructive: true,
      onSelect: actions.onDelete,
      isPending: (row) => actions.isRowPending?.(row) ?? false,
      disabled: (row) =>
        actions.disableDelete?.(row) || row.status === "complete",
    });
  }

  const actionColumn = createActionColumn<PurchaseOrderListItem>({
    actions: actionItems,
    getIsRowPending: (row) => actions.isRowPending?.(row) ?? false,
  });

  return [...baseColumns, actionColumn];
}
