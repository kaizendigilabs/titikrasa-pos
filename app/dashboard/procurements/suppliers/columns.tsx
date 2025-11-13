'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import { createActionColumn } from '@/components/tables/create-action-column';
import type { SupplierListItem } from '@/features/procurements/suppliers/types';
import Link from 'next/link';

type SupplierActionHandlers = {
  onEdit: (supplier: SupplierListItem) => void;
  onToggleStatus: (supplier: SupplierListItem) => void;
  onDelete: (supplier: SupplierListItem) => void;
  pendingActions: Record<string, 'toggle' | 'delete' | 'update'>;
  canManage: boolean;
};

export function createSupplierColumns({
  onEdit,
  onToggleStatus,
  onDelete,
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
        <Link href={`/dashboard/procurements/suppliers/${row.original.id}`}>
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

  const actionColumn = createActionColumn<SupplierListItem>({
    getIsRowPending: (supplier) => Boolean(pendingActions[supplier.id]),
    actions: [
      { type: 'label', label: 'Supplier Actions' },
      {
        label: 'Edit details',
        onSelect: onEdit,
        isPending: (supplier) => pendingActions[supplier.id] === 'update',
      },
      { type: 'separator' },
      {
        label: (supplier) => (supplier.is_active ? 'Deactivate' : 'Activate'),
        onSelect: onToggleStatus,
        isPending: (supplier) => pendingActions[supplier.id] === 'toggle',
      },
      { type: 'separator' },
      {
        label: 'Delete',
        onSelect: onDelete,
        destructive: true,
        isPending: (supplier) => pendingActions[supplier.id] === 'delete',
      },
    ],
  });

  return [...baseColumns, actionColumn];
}
