'use client';

import { ColumnDef } from '@tanstack/react-table';
import { IconDotsVertical, IconLoader2 } from '@tabler/icons-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PurchaseOrderListItem } from '@/features/procurements/purchase-orders/types';

type PurchaseOrderActions = {
  onEdit: (purchaseOrder: PurchaseOrderListItem) => void;
  onDelete?: (purchaseOrder: PurchaseOrderListItem) => void;
  pendingDeleteId?: string | null;
  disableActions?: boolean;
};

function formatStatus(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'pending':
      return <Badge className="border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>;
    case 'complete':
      return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Complete</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function createPurchaseOrderColumns(actions?: PurchaseOrderActions): ColumnDef<PurchaseOrderListItem>[] {
  const baseColumns: ColumnDef<PurchaseOrderListItem>[] = [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PO ID" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => formatStatus(row.original.status),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.items.length}</span>
      ),
    },
    {
      accessorKey: 'issued_at',
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
      accessorKey: 'completed_at',
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

  const actionColumn: ColumnDef<PurchaseOrderListItem> = {
    id: 'actions',
    cell: ({ row }) => {
      const purchaseOrder = row.original;
      const isDeleting = actions.pendingDeleteId === purchaseOrder.id;
      const disableAll = Boolean(actions.disableActions);
      const showDelete = typeof actions.onDelete === 'function';
      const deleteDisabled = disableAll || isDeleting || purchaseOrder.status === 'complete';

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={disableAll && !isDeleting}
            >
              <span className="sr-only">Open menu</span>
              {isDeleting ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconDotsVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Purchase Order</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => actions.onEdit(purchaseOrder)}
              disabled={disableAll && !isDeleting}
            >
              Edit
            </DropdownMenuItem>
            {showDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => actions.onDelete?.(purchaseOrder)}
                  disabled={deleteDisabled}
                  className="text-destructive focus:text-destructive"
                >
                  {isDeleting ? (
                    <span className="flex items-center gap-2">
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      Deleting…
                    </span>
                  ) : (
                    'Delete'
                  )}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
  };

  return [...baseColumns, actionColumn];
}
