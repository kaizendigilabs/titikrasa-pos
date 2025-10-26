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
import type { UserListItem } from '@/features/users/types';
import Link from 'next/link';

type UserActionHandlers = {
  onEdit: (user: UserListItem) => void;
  onToggleStatus: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
  onResetPassword: (user: UserListItem) => void;
  pendingActions: Record<string, 'toggle' | 'delete' | 'update'>;
  canManage: boolean;
  currentUserId: string;
};

export function createUserColumns({
  onEdit,
  onToggleStatus,
  onDelete,
  onResetPassword,
  pendingActions,
  canManage,
  currentUserId,
}: UserActionHandlers): ColumnDef<UserListItem>[] {
  const baseColumns: ColumnDef<UserListItem>[] = [
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
        <Link href={`/dashboard/users/${row.original.user_id}`}>
          <p className="font-medium text-foreground">
            {row.original.name ?? '—'}
          </p>
          <p className="text-sm text-muted-foreground">{row.original.email}</p>
        </Link>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <span className="capitalize text-sm text-muted-foreground">
          {row.original.role ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.phone ?? '-'}
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
    {
      accessorKey: 'last_login_at',
      header: () => <div>Last Login</div>,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.last_login_at
            ? new Date(row.original.last_login_at).toLocaleString()
            : 'Never'}
        </span>
      ),
    },
  ];

  if (!canManage) {
    return baseColumns;
  }

  const actionColumn: ColumnDef<UserListItem> = {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;
      const isSelf = user.user_id === currentUserId;
      const toggleLabel = user.is_active ? 'Deactivate' : 'Activate';
      const toggleDisabled = isSelf && user.is_active;
      const pendingState = pendingActions[user.user_id] ?? null;
      const isTogglePending = pendingState === 'toggle';
      const isDeletePending = pendingState === 'delete';
      const isUpdatePending = pendingState === 'update';
      const isRowPending = Boolean(pendingState);
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
            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onEdit(user)}
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
              onClick={() => onResetPassword(user)}
              disabled={isRowPending}
            >
              Send Reset Link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onToggleStatus(user)}
              disabled={toggleDisabled || isRowPending}
            >
              {toggleDisabled
                ? 'Cannot deactivate self'
                : isTogglePending
                ? (
                    <span className="flex items-center gap-2">
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      Updating status…
                    </span>
                  )
                : toggleLabel}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(user)}
              className="text-destructive focus:text-destructive"
              disabled={isSelf || isRowPending}
            >
              {isSelf
                ? 'Cannot delete self'
                : isDeletePending
                ? (
                    <span className="flex items-center gap-2">
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      Deleting…
                    </span>
                  )
                : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  return [...baseColumns, actionColumn];
}
