'use client';

import { ColumnDef } from '@tanstack/react-table';
import { IconAlertTriangle } from '@tabler/icons-react';
import Link from 'next/link';

import { DataTableColumnHeader } from '@/components/tables/data-table-column-header';
import { createActionColumn } from '@/components/tables/create-action-column';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';
import type { StoreIngredientListItem } from '@/features/inventory/store-ingredients/types';

function isLowStock(item: StoreIngredientListItem) {
  return item.currentStock <= item.minStock;
}

type ColumnOptions = {
  onEdit?: (ingredient: StoreIngredientListItem) => void;
  onDelete?: (ingredient: StoreIngredientListItem) => void;
  canManage?: boolean;
  isDeleting?: (ingredient: StoreIngredientListItem) => boolean;
};

export function createStoreIngredientColumns({
  onEdit,
  onDelete,
  canManage,
  isDeleting,
}: ColumnOptions): ColumnDef<StoreIngredientListItem>[] {
  const columns: ColumnDef<StoreIngredientListItem>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ingredient" />
      ),
      cell: ({ row }) => {
        const ingredient = row.original;
        const lowStock = isLowStock(ingredient);

        return (
          <Link
            href={`/dashboard/inventory/${ingredient.id}`}
            className="flex flex-col gap-1"
          >
            <span className="font-medium text-foreground">{ingredient.name}</span>
            <span className="text-sm text-muted-foreground">
              {ingredient.lastSupplierName
                ? `Last supplier: ${ingredient.lastSupplierName}`
                : 'No purchase recorded'}
            </span>
            {lowStock ? (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                <IconAlertTriangle className="h-3.5 w-3.5" />
                Low stock - needs attention
              </span>
            ) : null}
          </Link>
        );
      },
    },
    {
      accessorKey: 'sku',
      header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.sku ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'baseUom',
      header: () => <span>UOM</span>,
      cell: ({ row }) => (
        <span className="uppercase text-sm font-medium text-muted-foreground">
          {row.original.baseUom}
        </span>
      ),
    },
    {
      accessorKey: 'minStock',
      header: () => <span>Min Stock</span>,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatNumber(row.original.minStock, 0)}
        </span>
      ),
    },
    {
      accessorKey: 'currentStock',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Current Stock" />
      ),
      cell: ({ row }) => {
        const ingredient = row.original;
        const lowStock = isLowStock(ingredient);

        return (
          <span
            className={cn(
              'text-sm font-medium',
              lowStock ? 'text-amber-600' : 'text-foreground',
            )}
          >
            {formatNumber(ingredient.currentStock, 0)}
          </span>
        );
      },
    },
    {
      accessorKey: 'avgCost',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Avg Cost" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatCurrency(row.original.avgCost / 100)}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: () => <span>Status</span>,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted text-muted-foreground">
            Inactive
          </Badge>
        ),
    },
  ];

  if (onEdit || onDelete) {
    const actions = [];

    if (onEdit) {
      actions.push({
        label: "Edit ingredient",
        onSelect: onEdit,
        disabled: !canManage,
      });
    }

    if (onDelete) {
      actions.push({
        label: "Delete ingredient",
        onSelect: onDelete,
        disabled: (row: StoreIngredientListItem) => !canManage || (isDeleting?.(row) ?? false),
        variant: "destructive" as const,
      });
    }

    columns.push(
      createActionColumn<StoreIngredientListItem>({
        actions,
      }),
    );
  }

  return columns;
}
