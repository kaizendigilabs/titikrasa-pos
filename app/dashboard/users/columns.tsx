'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { createActionColumn } from "@/components/tables/create-action-column";
import type { UserListItem } from "@/features/users/types";
import Link from "next/link";

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
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
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
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <Link href={`/dashboard/users/${row.original.user_id}`}>
          <p className="font-medium text-foreground">
            {row.original.name ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">{row.original.email}</p>
        </Link>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="capitalize text-sm text-muted-foreground">
          {row.original.role ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.phone ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
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
      accessorKey: "last_login_at",
      header: () => <div>Last Login</div>,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.last_login_at
            ? new Date(row.original.last_login_at).toLocaleString()
            : "Never"}
        </span>
      ),
    },
  ];

  if (!canManage) {
    return baseColumns;
  }

  const actionColumn = createActionColumn<UserListItem>({
    actions: [
      { type: "label", label: "User Actions" },
      {
        label: "Edit Details",
        onSelect: onEdit,
        isPending: (user) => pendingActions[user.user_id] === "update",
      },
      {
        label: "Send Reset Link",
        onSelect: onResetPassword,
      },
      { type: "separator" },
      {
        label: (user) =>
          user.user_id === currentUserId && user.is_active
            ? "Cannot deactivate self"
            : user.is_active
              ? "Deactivate"
              : "Activate",
        onSelect: onToggleStatus,
        disabled: (user) => user.user_id === currentUserId && user.is_active,
        isPending: (user) => pendingActions[user.user_id] === "toggle",
        pendingLabel: (user) =>
          user.is_active ? "Updating status…" : "Updating status…",
      },
      {
        label: (user) =>
          user.user_id === currentUserId ? "Cannot delete self" : "Delete",
        onSelect: onDelete,
        destructive: true,
        disabled: (user) => user.user_id === currentUserId,
        isPending: (user) => pendingActions[user.user_id] === "delete",
      },
    ],
    getIsRowPending: (user) => Boolean(pendingActions[user.user_id]),
  });

  return [...baseColumns, actionColumn];
}
