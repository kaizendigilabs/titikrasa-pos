'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import { createActionColumn } from '@/components/tables/create-action-column';
import type { RecipeListItem } from '@/features/recipes/types';

type RecipeColumnHandlers = {
  onView: (recipe: RecipeListItem) => void;
  onEdit: (recipe: RecipeListItem) => void;
  onDelete: (recipe: RecipeListItem) => void;
  pendingActions: Record<string, 'delete'>;
  canManage: boolean;
};

export function createRecipeColumns({
  onView,
  onEdit,
  onDelete,
  pendingActions,
  canManage,
}: RecipeColumnHandlers): ColumnDef<RecipeListItem>[] {
  const columns: ColumnDef<RecipeListItem>[] = [
    {
      accessorKey: 'menuName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Menu" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm text-foreground">
            {row.original.menuName}
          </span>
          <span className="text-xs text-muted-foreground">
            Version {row.original.version}
          </span>
        </div>
      ),
    },
    {
      id: 'ingredientsCount',
      accessorFn: (row) => row.items.length,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ingredients" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.items.length}
        </span>
      ),
    },
    {
      accessorKey: 'effectiveFrom',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Effective Date" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {format(new Date(row.original.effectiveFrom), 'dd MMM yyyy')}
        </span>
      ),
    },
  ];

  const actionColumn = createActionColumn<RecipeListItem>({
    triggerLabel: 'Recipe actions',
    getIsRowPending: (recipe) => Boolean(pendingActions[recipe.id]),
    actions: [
      { type: 'label', label: 'Recipe' },
      {
        label: 'View detail',
        onSelect: onView,
      },
      { type: 'separator' },
      {
        label: 'Edit',
        onSelect: onEdit,
        hidden: () => !canManage,
      },
      { type: 'separator' },
      {
        label: 'Delete',
        onSelect: onDelete,
        destructive: true,
        isPending: (recipe) => pendingActions[recipe.id] === 'delete',
        hidden: () => !canManage,
      },
    ],
  });

  columns.push(actionColumn);

  return columns;
}
