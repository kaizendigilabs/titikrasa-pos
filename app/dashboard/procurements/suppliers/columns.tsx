'use client';

import { ColumnDef } from '@tanstack/react-table';
import { IconDotsVertical, IconLoader2 } from '@tabler/icons-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import type { SupplierListItem } from '@/features/procurements/suppliers/types';

type SupplierActionHandlers = {
  onEdit: (supplier: SupplierListItem) => void;
  onToggleStatus: (supplier: SupplierListItem) => void;
  onDelete: (supplier: SupplierListItem) => void;
  onManageCatalog: (supplier: SupplierListItem) => void;
  pendingActions: Record<string, 'toggle' | 'delete' | 'update' | 'catalog'>;
  canManage: boolean;
};

export function createSupplierColumns({
  onEdit,
  onToggleStatus,
  onDelete,
  onManageCatalog,
  pendingActions,
  canManage,
}: SupplierActionHandlers): ColumnDef<SupplierListItem>[] {
  const baseColumns: ColumnDef<SupplierListItem>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/dashboard/procurements/suppliers/${row.original.id}`}
          className="block"
        >
          <p className="font-medium text-foreground">
            {row.original.name ?? '—'}
          </p>
          <p className="text-sm text-muted-foreground">
            {row.original.contact.email ?? '—'}
          </p>
        </Link>
      ),
    },
    {
      accessorKey: 'contact.phone',
      header: 'Contact',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.contact.phone ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'contact.address',
      header: 'Address',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.contact.address ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: () => <div>Status</div>,
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Active
          </Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        ),
    },
  ];

  if (!canManage) {
    return baseColumns;
  }

  const actionColumn: ColumnDef<SupplierListItem> = {
    id: 'actions',
    cell: ({ row }) => {
      const supplier = row.original;
      const pendingState = pendingActions[supplier.id] ?? null;
      const isRowPending = Boolean(pendingState);
      const isTogglePending = pendingState === 'toggle';
      const isDeletePending = pendingState === 'delete';
      const isUpdatePending = pendingState === 'update';
      const toggleLabel = supplier.is_active ? 'Deactivate' : 'Activate';

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={isRowPending}
            >
              <span className="sr-only">Open menu</span>
              {isRowPending ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconDotsVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Supplier Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onEdit(supplier)}
              disabled={isRowPending}
            >
              {isUpdatePending ? (
                <span className="flex items-center gap-2">
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Updating…
                </span>
              ) : (
                'Edit Details'
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onManageCatalog(supplier)}
              disabled={isRowPending}
            >
              Manage Catalog
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onToggleStatus(supplier)}
              disabled={isRowPending}
            >
              {isTogglePending ? (
                <span className="flex items-center gap-2">
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Updating status…
                </span>
              ) : (
                toggleLabel
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(supplier)}
              className="text-destructive focus:text-destructive"
              disabled={isRowPending}
            >
              {isDeletePending ? (
                <span className="flex items-center gap-2">
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </span>
              ) : (
                'Delete'
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  return [...baseColumns, actionColumn];
}
