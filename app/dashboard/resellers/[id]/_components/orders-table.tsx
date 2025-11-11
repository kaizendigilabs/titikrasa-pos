'use client';

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import type {
  DataTableQueryHook,
  DataTableQueryResult,
  PaginationFilters,
} from "@/components/tables/use-data-table-state";
import { Badge } from "@/components/ui/badge";
import { useResellerOrders } from "@/features/resellers/hooks";
import type { ResellerOrderFilters } from "@/features/resellers/schemas";
import type { ResellerOrder } from "@/features/resellers/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";

type ResellerOrdersTableFilters = PaginationFilters & {
  paymentStatus: "all" | "paid" | "unpaid" | "void";
  search: string;
};

type TransactionsTableProps = {
  resellerId: string;
  initialData: DataTableQueryResult<ResellerOrder>;
};

const PAYMENT_STATUS_OPTIONS: Array<{
  label: string;
  value: ResellerOrdersTableFilters["paymentStatus"];
}> = [
  { label: "Semua status", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Void", value: "void" },
];

const columns: ColumnDef<ResellerOrder>[] = [
  {
    accessorKey: "number",
    header: "Order",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{row.original.number}</span>
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.original.status.replaceAll("_", " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Badge
          className="w-fit capitalize"
          variant={
            row.original.paymentStatus === "paid"
              ? "secondary"
              : row.original.paymentStatus === "unpaid"
                ? "outline"
                : "destructive"
          }
        >
          {row.original.paymentStatus}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {row.original.paymentMethod}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) =>
      row.original.dueDate ? (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.dueDate)}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(row.original.totalAmount / 100)}
      </span>
    ),
  },
];

function createResellerOrdersQueryHook(
  resellerId: string,
): DataTableQueryHook<ResellerOrder, ResellerOrdersTableFilters> {
  return (filters, options) => {
    const queryFilters: ResellerOrderFilters = {
      page: filters.page,
      pageSize: filters.pageSize,
      paymentStatus: filters.paymentStatus,
      ...(filters.search.trim().length > 0
        ? { search: filters.search.trim() }
        : {}),
    };

    return useResellerOrders(resellerId, queryFilters, {
      initialData: options?.initialData,
    });
  };
}

export function ResellerTransactionsTable({
  resellerId,
  initialData,
}: TransactionsTableProps) {
  const queryHook = React.useMemo(
    () => createResellerOrdersQueryHook(resellerId),
    [resellerId],
  );

  return (
    <DataTable
      columns={columns}
      initialFilters={{
        page: 1,
        pageSize: 10,
        paymentStatus: "all",
        search: "",
      }}
      initialData={initialData}
      queryHook={queryHook}
      getRowId={(row) => row.id}
      loadingMessage="Loading transactions..."
      emptyMessage="Belum ada transaksi reseller."
      renderToolbar={(context) => (
        <DataTableToolbar
          search={{
            value: context.filters.search,
            onChange: (value) => context.updateFilters({ search: value }),
            placeholder: "Cari nomor order",
            disabled: context.isSyncing,
          }}
          filters={[
            {
              type: "select",
              id: "payment-status",
              value: context.filters.paymentStatus,
              onValueChange: (value) =>
                context.updateFilters({
                  paymentStatus: (value ??
                    "all") as ResellerOrdersTableFilters["paymentStatus"],
                }),
              options: PAYMENT_STATUS_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              })),
              placeholder: "Payment Status",
              disabled: context.isSyncing,
            },
          ]}
          reset={{
            visible:
              context.filters.search.length > 0 ||
              context.filters.paymentStatus !== "all",
            onReset: () =>
              context.updateFilters(
                () => ({
                  ...context.filters,
                  search: "",
                  paymentStatus: "all",
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
