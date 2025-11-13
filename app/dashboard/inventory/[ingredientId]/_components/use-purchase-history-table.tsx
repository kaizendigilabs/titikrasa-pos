"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import type { DataTableRenderContext } from "@/components/tables/data-table";
import {
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
} from "@/components/tables/use-data-table-state";
import type { DataTableToolbarProps } from "@/components/tables/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import DateRangeFilter from "@/components/shared/DateRangeFilter";
import type { DateRangeType } from "@/lib/utils/date-helpers";
import { getDateRange } from "@/lib/utils/date-helpers";
import type { PurchaseHistoryEntry } from "@/features/inventory/store-ingredients/types";
import {
  useExportPurchaseHistoryMutation,
  usePurchaseHistory,
} from "@/features/inventory/store-ingredients/hooks";
import type { PurchaseHistoryFilters } from "@/features/inventory/store-ingredients/schemas";
import type { PurchaseHistoryMeta } from "@/features/inventory/store-ingredients/client";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/formatters";

type SupplierOption = {
  id: string;
  name: string;
};

export type PurchaseHistoryTableFilters = PaginationFilters & {
  supplierId: string | "all";
  search: string;
  from: string | null;
  to: string | null;
};

export type UsePurchaseHistoryTableArgs = {
  ingredientId: string;
  suppliers: SupplierOption[];
  initialHistory: {
    items: PurchaseHistoryEntry[];
    meta: PurchaseHistoryMeta;
  };
};

export type UsePurchaseHistoryTableResult = {
  columns: ColumnDef<PurchaseHistoryEntry>[];
  initialFilters: PurchaseHistoryTableFilters;
  initialData: DataTableQueryResult<PurchaseHistoryEntry>;
  queryHook: DataTableQueryHook<PurchaseHistoryEntry, PurchaseHistoryTableFilters>;
  getRowId: (row: PurchaseHistoryEntry) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<
      PurchaseHistoryEntry,
      PurchaseHistoryTableFilters
    >,
  ) => DataTableToolbarProps;
};

const STATUS_BADGE_VARIANTS: Record<string, "default" | "secondary" | "outline"> =
  {
    draft: "outline",
    pending: "secondary",
    complete: "default",
  };

function createColumns(): ColumnDef<PurchaseHistoryEntry>[] {
  return [
    {
      accessorKey: "completedAt",
      header: "Completed",
      cell: ({ row }) => {
        const value = row.original.completedAt ?? row.original.issuedAt;
        return (
          <span className="text-sm text-muted-foreground">
            {value ? formatDate(value) : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "supplierName",
      header: "Supplier",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.supplierName ?? "Unknown supplier"}
        </span>
      ),
    },
    {
      accessorKey: "qty",
      header: "Quantity",
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
      accessorKey: "price",
      header: "Unit Price",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatCurrency(row.original.price)}
        </span>
      ),
    },
    {
      accessorKey: "lineTotal",
      header: "Line Total",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">
          {formatCurrency(row.original.lineTotal)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status ?? "draft";
        const variant = STATUS_BADGE_VARIANTS[status] ?? "outline";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
  ];
}

function usePurchaseHistoryQuery(
  ingredientId: string,
): DataTableQueryHook<PurchaseHistoryEntry, PurchaseHistoryTableFilters> {
  return function usePurchaseHistoryDataHook(filters, options) {
    const queryFilters: PurchaseHistoryFilters = {
      page: filters.page,
      pageSize: filters.pageSize,
      supplierId: filters.supplierId !== "all" ? filters.supplierId : undefined,
      from: filters.from ?? undefined,
      to: filters.to ?? undefined,
      search: filters.search.trim() ? filters.search.trim() : undefined,
    };

    const hookOptions = options?.initialData
      ? {
          initialData: {
            items: options.initialData.items,
            meta: options.initialData.meta as PurchaseHistoryMeta | null,
          },
        }
      : undefined;

    return usePurchaseHistory(ingredientId, queryFilters, hookOptions);
  };
}

export function usePurchaseHistoryTableController({
  ingredientId,
  suppliers,
  initialHistory,
}: UsePurchaseHistoryTableArgs): UsePurchaseHistoryTableResult {
  const initialFilters = React.useMemo<PurchaseHistoryTableFilters>(
    () => ({
      page: initialHistory.meta.pagination.page,
      pageSize: initialHistory.meta.pagination.pageSize,
      supplierId: initialHistory.meta.filters.supplierId ?? "all",
      search: initialHistory.meta.filters.search ?? "",
      from: initialHistory.meta.filters.from ?? null,
      to: initialHistory.meta.filters.to ?? null,
    }),
    [initialHistory],
  );

  const columns = React.useMemo(() => createColumns(), []);
  const queryHook = usePurchaseHistoryQuery(ingredientId);
  const [rangePreset, setRangePreset] = React.useState<DateRangeType | null>(
    null,
  );
  const exportMutation = useExportPurchaseHistoryMutation(ingredientId);

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<
        PurchaseHistoryEntry,
        PurchaseHistoryTableFilters
      >,
    ): DataTableToolbarProps => {
      const showReset =
        context.filters.search.trim().length > 0 ||
        context.filters.supplierId !== "all" ||
        Boolean(context.filters.from || context.filters.to);

      const handleRangeChange = (preset: DateRangeType) => {
        setRangePreset(preset);
        const { start, end } = getDateRange(preset);
        context.updateFilters(
          {
            from: start.toISOString(),
            to: end.toISOString(),
          },
          { resetPage: true },
        );
      };

      const handleExport = async () => {
        try {
          const filters: PurchaseHistoryFilters = {
            page: context.filters.page,
            pageSize: context.filters.pageSize,
            supplierId:
              context.filters.supplierId !== "all"
                ? context.filters.supplierId
                : undefined,
            from: context.filters.from ?? undefined,
            to: context.filters.to ?? undefined,
            search: context.filters.search.trim()
              ? context.filters.search.trim()
              : undefined,
          };
          await exportMutation.mutateAsync(filters);
          toast.success("Export started");
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to export purchase history";
          toast.error(message);
        }
      };

      return {
        search: {
          value: context.filters.search,
          onChange: (value) => context.updateFilters({ search: value }),
          placeholder: "Search PO ID",
          disabled: context.isSyncing,
        },
        filters: [
          {
            type: "select",
            id: "supplier-filter",
            value: context.filters.supplierId,
            onValueChange: (value) =>
              context.updateFilters(
                {
                  supplierId: (value ?? "all") as PurchaseHistoryTableFilters["supplierId"],
                },
                { resetPage: true },
              ),
            options: [
              { label: "All suppliers", value: "all" },
              ...suppliers.map((supplier) => ({
                label: supplier.name,
                value: supplier.id,
              })),
            ],
            placeholder: "Supplier",
            disabled: context.isSyncing,
          },
          {
            type: "custom",
            id: "date-range",
            element: (
              <div className="flex items-center gap-3">
                <DateRangeFilter
                  value={rangePreset ?? "month"}
                  onChange={handleRangeChange}
                />
                {context.filters.from || context.filters.to ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => {
                      setRangePreset(null);
                      context.updateFilters(
                        { from: null, to: null },
                        { resetPage: true },
                      );
                    }}
                  >
                    Clear dates
                  </button>
                ) : null}
              </div>
            ),
          },
        ],
        reset: {
          visible: showReset,
          onReset: () => {
            setRangePreset(null);
            context.updateFilters(
              {
                search: "",
                supplierId: "all",
                from: null,
                to: null,
              },
              { resetPage: true },
            );
          },
          disabled: context.isSyncing,
        },
        status: {
          isSyncing: context.isSyncing,
        },
        secondaryActions: (
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={handleExport}
            disabled={exportMutation.isPending || context.isSyncing}
          >
            Export CSV
          </button>
        ),
      };
    },
    [exportMutation, rangePreset, suppliers],
  );

  return {
    columns,
    initialFilters,
    initialData: {
      items: initialHistory.items,
      meta: initialHistory.meta,
    },
    queryHook,
    getRowId: (row) =>
      row.purchaseOrderId ??
      `${row.supplierId ?? "supplier"}-${row.completedAt ?? row.issuedAt ?? "row"}`,
    buildToolbarConfig,
  };
}
