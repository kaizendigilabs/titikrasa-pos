'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { createActionColumn } from "@/components/tables/create-action-column";
import type { ResellerListItem } from "@/features/resellers/types";
import Link from "next/link";

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
        <Link
          href={`/dashboard/resellers/${row.original.id}`}
          className="text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <p className="font-medium text-foreground">
            {row.original.name ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {row.original.contact.email ?? "—"}
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

  const actionColumn = createActionColumn<ResellerListItem>({
    getIsRowPending: (reseller) => Boolean(pendingActions[reseller.id]),
    actions: [
      { type: "label", label: "Reseller Actions" },
      {
        label: (reseller) => `Edit ${reseller.name ?? "details"}`,
        onSelect: onEdit,
        isPending: (reseller) => pendingActions[reseller.id] === "update",
      },
      { type: "separator" },
      {
        label: (reseller) => (reseller.is_active ? "Deactivate" : "Activate"),
        onSelect: onToggleStatus,
        isPending: (reseller) => pendingActions[reseller.id] === "toggle",
      },
      { type: "separator" },
      {
        label: "Delete",
        onSelect: onDelete,
        destructive: true,
        isPending: (reseller) => pendingActions[reseller.id] === "delete",
      },
    ],
  });

  return [...baseColumns, actionColumn];
}
