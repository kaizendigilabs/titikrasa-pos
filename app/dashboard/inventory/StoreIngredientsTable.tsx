'use client';

import * as React from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
import Link from 'next/link';

import { createStoreIngredientColumns } from './columns';
import { DataTableContent } from '@/components/tables/data-table-content';
import { DataTablePagination } from '@/components/tables/data-table-pagination';
import { DataTableSelectFilter } from '@/components/tables/data-table-select-filter';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StoreIngredientFilters } from '@/features/inventory/store-ingredients/schemas';
import {
  useStoreIngredients,
  useStoreIngredientsRealtime,
  useUpdateStoreIngredientMutation,
} from '@/features/inventory/store-ingredients/hooks';
import type { StoreIngredientListItem } from '@/features/inventory/store-ingredients/types';
import { toast } from 'sonner';

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | 'active' | 'inactive' }> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

type StoreIngredientsTableProps = {
  initialItems: StoreIngredientListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      search: string | null;
      status: 'all' | 'active' | 'inactive';
      lowStockOnly: boolean;
    };
  };
  canManage: boolean;
};

export function StoreIngredientsTable({
  initialItems,
  initialMeta,
  canManage,
}: StoreIngredientsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState(initialMeta.filters.search ?? '');
  const [status, setStatus] = React.useState<'all' | 'active' | 'inactive'>(
    initialMeta.filters.status,
  );
  const [lowStockOnly, setLowStockOnly] = React.useState(
    Boolean(initialMeta.filters.lowStockOnly),
  );
  const [filters, setFilters] = React.useState<StoreIngredientFilters>(() => ({
    page: initialMeta.pagination.page,
    pageSize: initialMeta.pagination.pageSize,
    search: initialMeta.filters.search ?? undefined,
    status: initialMeta.filters.status,
    lowStockOnly: initialMeta.filters.lowStockOnly,
  }));

  const ingredientsQuery = useStoreIngredients(filters, {
    initialData: {
      items: initialItems,
      meta: initialMeta
        ? {
            pagination: initialMeta.pagination,
            filters: initialMeta.filters,
          }
        : null,
    },
  });

  useStoreIngredientsRealtime(true);

  const items = ingredientsQuery.data?.items ?? initialItems;
  const paginationMeta = ingredientsQuery.data?.meta?.pagination ?? initialMeta.pagination;

  const pageCount =
    paginationMeta && paginationMeta.pageSize > 0
      ? Math.ceil((paginationMeta.total ?? items.length) / paginationMeta.pageSize)
      : -1;

  const [isEditOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StoreIngredientListItem | null>(null);
  const [formValues, setFormValues] = React.useState<{
    sku: string;
    minStock: string;
    isActive: boolean;
  }>({
    sku: '',
    minStock: '0',
    isActive: true,
  });

  const updateMutation = useUpdateStoreIngredientMutation();

  const handleOpenEdit = React.useCallback(
    (ingredient: StoreIngredientListItem) => {
      setEditing(ingredient);
      setFormValues({
        sku: ingredient.sku ?? '',
        minStock: String(ingredient.minStock ?? 0),
        isActive: ingredient.isActive,
      });
      setEditOpen(true);
    },
    [],
  );

  const handleCloseEdit = React.useCallback((open: boolean) => {
    if (!open) {
      setEditOpen(false);
      setEditing(null);
    } else {
      setEditOpen(true);
    }
  }, []);

  const columns = React.useMemo(
    () =>
      createStoreIngredientColumns({
        onEdit: handleOpenEdit,
        canManage,
      }),
    [handleOpenEdit, canManage],
  );

  const table = useReactTable({
    data: items,
    columns,
    manualPagination: true,
    pageCount,
    state: {
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.pageSize,
      },
    },
    onPaginationChange: (updater) => {
      setFilters((prev: StoreIngredientFilters) => {
        const current = { pageIndex: prev.page - 1, pageSize: prev.pageSize };
        const next =
          typeof updater === 'function'
            ? updater(current)
            : updater;

        return {
          ...prev,
          page: next.pageIndex + 1,
          pageSize: next.pageSize,
        };
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isLoading = ingredientsQuery.isFetching;

  const handleApplySearch = React.useCallback(() => {
    setFilters((prev: StoreIngredientFilters) => ({
      ...prev,
      page: 1,
      search: searchTerm.trim() ? searchTerm.trim() : undefined,
    }));
  }, [searchTerm]);

  React.useEffect(() => {
    setFilters((prev: StoreIngredientFilters) => ({
      ...prev,
      page: 1,
      status,
    }));
  }, [status]);

  React.useEffect(() => {
    setFilters((prev: StoreIngredientFilters) => ({
      ...prev,
      page: 1,
      lowStockOnly,
    }));
  }, [lowStockOnly]);

  const handleSubmitEdit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editing) return;

      const minStockValue = Number.parseInt(formValues.minStock, 10);
      if (!Number.isFinite(minStockValue) || minStockValue < 0) {
        toast.error('Minimum stock must be a non-negative integer');
        return;
      }

      try {
        await updateMutation.mutateAsync({
          ingredientId: editing.id,
          payload: {
            sku: formValues.sku,
            minStock: minStockValue,
            isActive: formValues.isActive,
          },
        });
        toast.success('Ingredient updated successfully');
        setEditOpen(false);
        setEditing(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update ingredient';
        toast.error(message);
      }
    },
    [editing, formValues, updateMutation],
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border/60 bg-card px-4 py-3">
        <div className="flex flex-1 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search ingredients"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleApplySearch();
                }
              }}
              className="w-64"
            />
            <Button variant="secondary" size="sm" onClick={handleApplySearch}>
              <IconSearch className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
          <DataTableSelectFilter
            value={status}
            onValueChange={(value) =>
              setStatus(value as 'all' | 'active' | 'inactive')
            }
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
          <div className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-1.5">
            <Checkbox
              id="low-stock-only"
              checked={lowStockOnly}
              onCheckedChange={(value) => setLowStockOnly(Boolean(value))}
            />
            <Label
              htmlFor="low-stock-only"
              className="text-sm font-medium text-muted-foreground"
            >
              Low stock only
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => ingredientsQuery.refetch()}
            disabled={isLoading}
          >
            <IconRefresh className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" asChild disabled={!canManage}>
            <Link href="/dashboard/inventory/stock-adjustments">Stock Opname</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-card">
        <DataTableContent table={table} isLoading={isLoading} />
        <div className="border-t border-border/60 py-2">
          <DataTablePagination table={table} />
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={handleCloseEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ingredient</DialogTitle>
            <DialogDescription>
              Update SKU, minimum stock, and status for this ingredient.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-sku">SKU</Label>
              <Input
                id="ingredient-sku"
                value={formValues.sku}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    sku: event.target.value,
                  }))
                }
                placeholder="SKU (optional)"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-min-stock">Minimum Stock</Label>
              <Input
                id="ingredient-min-stock"
                value={formValues.minStock}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    minStock: event.target.value.replace(/[^0-9]/g, ''),
                  }))
                }
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="ingredient-active"
                checked={formValues.isActive}
                onCheckedChange={(value) =>
                  setFormValues((prev) => ({
                    ...prev,
                    isActive: Boolean(value),
                  }))
                }
              />
              <Label htmlFor="ingredient-active" className="text-sm font-medium">
                Ingredient is active
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleCloseEdit(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
