'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  IconDotsVertical,
  IconLoader2,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';

import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils/formatters';
import type { MenuListItem } from '@/features/menus/types';

type MenuActionHandlers = {
  onEdit: (menu: MenuListItem) => void;
  onToggleStatus: (menu: MenuListItem) => void;
  onDelete: (menu: MenuListItem) => void;
  pending: Record<string, 'toggle' | 'delete' | 'update'>;
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
  pending,
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
      cell: ({ row }) =>
        row.original.default_retail_price != null ? (
          <span className="text-sm text-foreground">
            {formatCurrency(row.original.default_retail_price)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Belum diatur</span>
        ),
    },
    {
      accessorKey: 'default_reseller_price',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Harga Reseller" />
      ),
      cell: ({ row }) =>
        row.original.default_reseller_price != null ? (
          <span className="text-sm text-foreground">
            {formatCurrency(row.original.default_reseller_price)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Belum diatur</span>
        ),
    },
  ];

  if (!canManage) {
    return columns;
  }

  columns.push({
    id: 'active',
    header: 'Aktif',
    cell: ({ row }) => {
      const menu = row.original;
      const state = pending[menu.id];
      const isPending = state === 'toggle';
      return (
        <Switch
          checked={menu.is_active}
          disabled={isPending}
          onCheckedChange={() => onToggleStatus(menu)}
          aria-label={`Toggle status ${menu.name}`}
        />
      );
    },
  });

  columns.push({
    id: 'actions',
    cell: ({ row }) => {
      const menu = row.original;
      const state = pending[menu.id];
      const isRowPending = Boolean(state);
      const isDeletePending = state === 'delete';
      const isUpdatePending = state === 'update';

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              className="h-8 w-8 p-0"
              disabled={isRowPending}
            >
              <span className="sr-only">Aksi menu</span>
              {isRowPending ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconDotsVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Menu</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onEdit(menu)}
              disabled={isRowPending}
            >
              <IconPencil className="mr-2 h-4 w-4" />
              {isUpdatePending ? 'Memperbarui…' : 'Edit'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(menu)}
              className="text-destructive"
              disabled={isRowPending}
            >
              <IconTrash className="mr-2 h-4 w-4" />
              {isDeletePending ? 'Menghapus…' : 'Hapus'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  });

  return columns;
}
