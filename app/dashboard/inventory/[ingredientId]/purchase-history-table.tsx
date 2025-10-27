'use client';

import * as React from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  type Updater,
  useReactTable,
} from '@tanstack/react-table';

import { DataTableContent } from '@/components/tables/data-table-content';
import { DataTablePagination } from '@/components/tables/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { PurchaseHistoryFilters } from '@/features/inventory/store-ingredients/schemas';
import { usePurchaseHistory } from '@/features/inventory/store-ingredients/hooks';
import type { PurchaseHistoryEntry } from '@/features/inventory/store-ingredients/types';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/formatters';

type SupplierOption = {
  id: string;
  name: string;
};

type PurchaseHistoryTableProps = {
  ingredientId: string;
  suppliers: SupplierOption[];
  initialHistory: {
    items: PurchaseHistoryEntry[];
    meta: {
      pagination: { page: number; pageSize: number; total: number };
      filters: { supplierId: string | null; from: string | null; to: string | null };
    };
  };
};

const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  pending: 'secondary',
  complete: 'default',
};

export function PurchaseHistoryTable({
  ingredientId,
  suppliers,
  initialHistory,
}: PurchaseHistoryTableProps) {
  const [filters, setFilters] = React.useState<PurchaseHistoryFilters>(() => ({
    page: initialHistory.meta.pagination.page,
    pageSize: initialHistory.meta.pagination.pageSize,
    supplierId: initialHistory.meta.filters.supplierId ?? undefined,
    from: initialHistory.meta.filters.from ?? undefined,
    to: initialHistory.meta.filters.to ?? undefined,
  }));

  const historyQuery = usePurchaseHistory(ingredientId, filters, {
    initialData: {
      items: initialHistory.items,
      meta: {
        pagination: initialHistory.meta.pagination,
        filters: initialHistory.meta.filters,
      },
    },
  });

  const items = historyQuery.data?.items ?? initialHistory.items;
  const paginationMeta = historyQuery.data?.meta?.pagination ?? initialHistory.meta.pagination;

  const pageCount =
    paginationMeta.pageSize > 0
      ? Math.ceil((paginationMeta.total ?? items.length) / paginationMeta.pageSize)
      : -1;

  const columns = React.useMemo<ColumnDef<PurchaseHistoryEntry>[]>(
    () => [
      {
        accessorKey: 'completedAt',
        header: 'Completed',
        cell: ({ row }) => {
          const value = row.original.completedAt ?? row.original.issuedAt;
          return (
            <span className="text-sm text-muted-foreground">
              {value ? formatDate(value) : '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'supplierName',
        header: 'Supplier',
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.supplierName ?? 'Unknown supplier'}
          </span>
        ),
      },
      {
        accessorKey: 'qty',
        header: 'Quantity',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {formatNumber(row.original.qty, 0)}
            </span>
            <span className="text-xs text-muted-foreground uppercase">
              {row.original.baseUom}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Unit Price',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatCurrency(row.original.price)}
          </span>
        ),
      },
      {
        accessorKey: 'lineTotal',
        header: 'Line Total',
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">
            {formatCurrency(row.original.lineTotal)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          const variant = STATUS_BADGE_VARIANTS[status] ?? 'outline';
          return <Badge variant={variant}>{status}</Badge>;
        },
      },
    ],
    [],
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
    onPaginationChange: (updater: Updater<PaginationState>) => {
      setFilters((prev: PurchaseHistoryFilters) => {
        const current: PaginationState = {
          pageIndex: prev.page - 1,
          pageSize: prev.pageSize,
        };
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

  const isLoading = historyQuery.isFetching;

  const [localSupplier, setLocalSupplier] = React.useState(
    filters.supplierId ?? 'all',
  );
  const [fromDate, setFromDate] = React.useState(filters.from ?? '');
  const [toDate, setToDate] = React.useState(filters.to ?? '');

  const handleApplyFilters = React.useCallback(() => {
    setFilters((prev: PurchaseHistoryFilters) => ({
      ...prev,
      page: 1,
      supplierId: localSupplier === 'all' ? undefined : localSupplier,
      from: fromDate || undefined,
      to: toDate || undefined,
    }));
  }, [fromDate, localSupplier, toDate]);

  const handleResetFilters = React.useCallback(() => {
    setLocalSupplier('all');
    setFromDate('');
    setToDate('');
    setFilters((prev: PurchaseHistoryFilters) => ({
      ...prev,
      page: 1,
      supplierId: undefined,
      from: undefined,
      to: undefined,
    }));
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-medium">
          Purchase History
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <Label htmlFor="supplier-filter" className="text-xs text-muted-foreground">
              Supplier
            </Label>
            <Select
              value={localSupplier}
              onValueChange={(value) => setLocalSupplier(value)}
            >
              <SelectTrigger id="supplier-filter" className="h-9 w-48">
                <SelectValue placeholder="All suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col">
            <Label htmlFor="from-date" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex flex-col">
            <Label htmlFor="to-date" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleApplyFilters} disabled={isLoading}>
              Apply
            </Button>
            <Button size="sm" variant="secondary" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-md border border-border/60">
          <DataTableContent table={table} isLoading={isLoading} />
          <div className="border-t border-border/60 py-2">
            <DataTablePagination table={table} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
