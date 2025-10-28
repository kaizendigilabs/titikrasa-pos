'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  IconDotsVertical,
  IconLoader2,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';

import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import type { MenuCategory } from '@/features/menu-categories/types';

type CategoryHandlers = {
  onEdit: (category: MenuCategory) => void;
  onToggle: (category: MenuCategory) => void;
  onDelete: (category: MenuCategory) => void;
  pending: Record<string, 'toggle' | 'delete' | 'update'>;
  canManage: boolean;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function createCategoryColumns({
  onEdit,
  onToggle,
  onDelete,
  pending,
  canManage,
}: CategoryHandlers): ColumnDef<MenuCategory>[] {
  const columns: ColumnDef<MenuCategory>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nama" />,
      cell: ({ row }) => {
        const category = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border">
              {category.icon_url ? (
                <AvatarImage src={category.icon_url} alt={category.name} />
              ) : (
                <AvatarFallback>{getInitials(category.name)}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm text-foreground">
                {category.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {category.slug}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'sort_order',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Urutan" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.sort_order}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Aktif
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Nonaktif
          </Badge>
        ),
    },
  ];

  if (!canManage) {
    return columns;
  }

  columns.splice(2, 0, {
    id: 'toggle',
    header: 'Aktif',
    cell: ({ row }) => {
      const category = row.original;
      const state = pending[category.id];
      const isPending = state === 'toggle';
      return (
        <Switch
          checked={category.is_active}
          onCheckedChange={() => onToggle(category)}
          disabled={isPending}
          aria-label={`Toggle status ${category.name}`}
        />
      );
    },
    enableSorting: false,
  });

  columns.push({
    id: 'actions',
    cell: ({ row }) => {
      const category = row.original;
      const state = pending[category.id];
      const isRowPending = Boolean(state);
      const isDeletePending = state === 'delete';
      const isUpdatePending = state === 'update';

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={isRowPending}
            >
              <span className="sr-only">Aksi kategori</span>
              {isRowPending ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconDotsVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onEdit(category)}
              disabled={isRowPending}
            >
              <IconPencil className="mr-2 h-4 w-4" />
              {isUpdatePending ? 'Memperbarui…' : 'Edit'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(category)}
              disabled={isRowPending}
              className="text-destructive"
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
