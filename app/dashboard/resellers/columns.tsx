'use client';

import { ColumnDef } from '@tanstack/react-table';
import { IconDotsVertical, IconLoader2 } from '@tabler/icons-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import type { ResellerListItem } from '@/features/resellers/types';
import Link from 'next/link';

type ResellerActionHandlers = {
  onEdit: (reseller: ResellerListItem) => void;
  onToggleStatus: (reseller: ResellerListItem) => void;
  onDelete: (reseller: ResellerListItem) => void;
  pendingActions: Record<string, 'toggle' | 'delete' | 'update'>;
  canManage: boolean;
};

export function createResellerColumns({
  onEdit,
  onToggleStatus,
  onDelete,
  pendingActions,
  canManage,
}: ResellerActionHandlers): ColumnDef<ResellerListItem>[] {
  const baseColumns: ColumnDef<ResellerListItem>[] = [
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
        <Link href={`/dashboard/resellers/${row.original.id}`}>
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

  const actionColumn: ColumnDef<ResellerListItem> = {
    id: 'actions',
    cell: ({ row }) => {
      const reseller = row.original;
      const pendingState = pendingActions[reseller.id] ?? null;
      const isTogglePending = pendingState === 'toggle';
      const isDeletePending = pendingState === 'delete';
      const isUpdatePending = pendingState === 'update';
      const isRowPending = Boolean(pendingState);
      const toggleLabel = reseller.is_active ? 'Deactivate' : 'Activate';
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
            <DropdownMenuLabel>Reseller Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onEdit(reseller)}
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onToggleStatus(reseller)}
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(reseller)}
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
