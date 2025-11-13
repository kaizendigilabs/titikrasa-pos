'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { createActionColumn } from '@/components/tables/create-action-column';
import type { MenuCategory } from '@/features/menu-categories/types';

type CategoryHandlers = {
  onEdit: (category: MenuCategory) => void;
  onToggle: (category: MenuCategory) => void;
  onDelete: (category: MenuCategory) => void;
  pendingActions: Record<string, 'toggle' | 'delete' | 'update'>;
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
  pendingActions,
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

  const actionColumn = createActionColumn<MenuCategory>({
    getIsRowPending: (category) => Boolean(pendingActions[category.id]),
    triggerLabel: 'Menu category actions',
    actions: [
      { type: 'label', label: 'Aksi Kategori' },
      {
        label: (category) => `Edit ${category.name}`,
        onSelect: onEdit,
        isPending: (category) => pendingActions[category.id] === 'update',
      },
      { type: 'separator' },
      {
        label: (category) => (category.is_active ? 'Nonaktifkan' : 'Aktifkan'),
        onSelect: onToggle,
        isPending: (category) => pendingActions[category.id] === 'toggle',
      },
      { type: 'separator' },
      {
        label: 'Hapus',
        onSelect: onDelete,
        destructive: true,
        isPending: (category) => pendingActions[category.id] === 'delete',
      },
    ],
  });

  columns.push(actionColumn);

  return columns;
}
