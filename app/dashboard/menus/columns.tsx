'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import { createActionColumn } from '@/components/tables/create-action-column';
import { Badge } from '@/components/ui/badge';
import type { MenuListItem } from '@/features/menus/types';
import { formatMenuPrice } from '@/features/menus/utils';

type MenuActionHandlers = {
  onEdit: (menu: MenuListItem) => void;
  onToggleStatus: (menu: MenuListItem) => void;
  onDelete: (menu: MenuListItem) => void;
  pendingActions: Record<string, 'toggle' | 'delete' | 'update'>;
  canManage: boolean;
};

const TYPE_LABEL: Record<MenuListItem['type'], string> = {
  simple: 'Simple',
  variant: 'Variant',
};

export function createMenuColumns({
  onEdit,
  onToggleStatus,
  onDelete,
  pendingActions,
  canManage,
}: MenuActionHandlers): ColumnDef<MenuListItem>[] {
  const columns: ColumnDef<MenuListItem>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Menu" />,
      cell: ({ row }) => {
        const menu = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-sm text-foreground">
              {menu.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {menu.sku ?? 'SKU tidak ditentukan'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'category_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kategori" />,
      cell: ({ row }) =>
        row.original.category_name ? (
          <Badge variant="outline" className="text-xs">
            {row.original.category_name}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Tanpa kategori</span>
        ),
    },
    {
      accessorKey: 'type',
      header: 'Tipe',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs">
          {TYPE_LABEL[row.original.type]}
        </Badge>
      ),
    },
    {
      accessorKey: 'default_retail_price',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Harga Retail" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {formatMenuPrice(row.original.default_retail_price)}
        </span>
      ),
    },
    {
      accessorKey: 'default_reseller_price',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Harga Reseller" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {formatMenuPrice(row.original.default_reseller_price)}
        </span>
      ),
    },
  ];

  if (!canManage) {
    return columns;
  }

  const actionColumn = createActionColumn<MenuListItem>({
    getIsRowPending: (menu) => Boolean(pendingActions[menu.id]),
    triggerLabel: 'Menu actions',
    actions: [
      { type: 'label', label: 'Aksi Menu' },
      {
        label: "Edit",
        onSelect: onEdit,
        isPending: (menu) => pendingActions[menu.id] === 'update',
      },
      { type: 'separator' },
      {
        label: (menu) => (menu.is_active ? 'Nonaktifkan' : 'Aktifkan'),
        onSelect: onToggleStatus,
        isPending: (menu) => pendingActions[menu.id] === 'toggle',
      },
      { type: 'separator' },
      {
        label: 'Hapus',
        onSelect: onDelete,
        destructive: true,
        isPending: (menu) => pendingActions[menu.id] === 'delete',
      },
    ],
  });

  columns.push(actionColumn);

  return columns;
}
