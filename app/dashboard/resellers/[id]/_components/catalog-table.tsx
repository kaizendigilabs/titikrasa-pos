"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import type {
  DataTableQueryHook,
  DataTableQueryResult,
  PaginationFilters,
} from "@/components/tables/use-data-table-state";
import { Badge } from "@/components/ui/badge";
import { useResellerCatalog } from "@/features/resellers/hooks";
import type { ResellerCatalogFilters } from "@/features/resellers/schemas";
import type { ResellerCatalogEntry } from "@/features/resellers/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";

type CatalogTableFilters = PaginationFilters & {
  search: string;
};

type CatalogTableProps = {
  resellerId: string;
  initialData: DataTableQueryResult<ResellerCatalogEntry>;
};

const columns: ColumnDef<ResellerCatalogEntry>[] = [
  {
    accessorKey: "menuName",
    header: "Menu / Item",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        {row.original.thumbnailUrl ? (
          <Image
            src={row.original.thumbnailUrl}
            alt={row.original.menuName}
            width={40}
            height={40}
            className="size-10 rounded-md object-cover"
          />
        ) : (
          <div className="size-10 rounded-md bg-muted" />
        )}
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.original.menuName}</span>
          <span className="text-xs text-muted-foreground">
            Terjual {row.original.totalQty} kali
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "lastOrderAt",
    header: "Transaksi Terakhir",
    cell: ({ row }) =>
      row.original.lastOrderAt ? (
        <div className="flex flex-col">
          <span className="text-sm text-foreground">
            {formatDateTime(row.original.lastOrderAt)}
          </span>
          {row.original.lastPrice != null ? (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(row.original.lastPrice / 100)}
            </span>
          ) : null}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "totalQty",
    header: "Qty Terjual",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-medium">
        {row.original.totalQty} pcs
      </Badge>
    ),
  },
];

function createCatalogQueryHook(
  resellerId: string,
): DataTableQueryHook<ResellerCatalogEntry, CatalogTableFilters> {
  return (filters, options) => {
    const queryFilters: ResellerCatalogFilters = {
      page: filters.page,
      pageSize: filters.pageSize,
      ...(filters.search.trim().length > 0
        ? { search: filters.search.trim() }
        : {}),
    };

    return useResellerCatalog(resellerId, queryFilters, {
      initialData: options?.initialData,
    });
  };
}

export function ResellerCatalogTable({
  resellerId,
  initialData,
}: CatalogTableProps) {
  const queryHook = React.useMemo(
    () => createCatalogQueryHook(resellerId),
    [resellerId],
  );

  return (
    <DataTable
      columns={columns}
      initialFilters={{
        page: 1,
        pageSize: 8,
        search: "",
      }}
      initialData={initialData}
      queryHook={queryHook}
      getRowId={(row) => row.menuId}
      loadingMessage="Loading catalog..."
      emptyMessage="Belum ada katalog untuk reseller ini."
      renderToolbar={(context) => (
        <DataTableToolbar
          search={{
            value: context.filters.search,
            onChange: (value) => context.updateFilters({ search: value }),
            placeholder: "Cari menu / bahan",
            disabled: context.isSyncing,
          }}
          reset={{
            visible: context.filters.search.length > 0,
            onReset: () =>
              context.updateFilters(
                () => ({
                  ...context.filters,
                  search: "",
                }),
                { resetPage: true },
              ),
            disabled: context.isSyncing,
          }}
          status={{ isSyncing: context.isSyncing }}
        />
      )}
    />
  );
}
