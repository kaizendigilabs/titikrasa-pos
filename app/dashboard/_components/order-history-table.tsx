"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/data-table";
import type {
  DataTableQueryHook,
  PaginationFilters,
} from "@/components/tables/use-data-table-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardTransaction } from "@/features/dashboard/types";
import { useDashboardOrders } from "@/features/dashboard/hooks";
import type { DateRangeType } from "@/lib/utils/date-helpers";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";

type OrdersTableFilters = PaginationFilters & {
  range: DateRangeType;
};

type OrderHistoryTableProps = {
  range: DateRangeType;
  pageSize?: number;
};

const columns: ColumnDef<DashboardTransaction>[] = [
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
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => (
      <span className="text-sm capitalize text-muted-foreground">
        {row.original.channel}
      </span>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.paymentStatus === "paid" ? "secondary" : "outline"}
        className="w-fit rounded-full px-3 py-1 text-xs uppercase"
      >
        {row.original.paymentStatus}
      </Badge>
    ),
  },
  {
    accessorKey: "grandTotal",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">
        {formatCurrency(row.original.grandTotal)}
      </span>
    ),
  },
];

const createOrdersQuery = (): DataTableQueryHook<
  DashboardTransaction,
  OrdersTableFilters
> => {
  return (filters, options) =>
    useDashboardOrders(
      {
        range: filters.range,
        page: filters.page,
        pageSize: filters.pageSize,
      },
      { initialData: options?.initialData },
    );
};

export function OrderHistoryTable({ range, pageSize = 8 }: OrderHistoryTableProps) {
  const queryHook = React.useMemo(() => createOrdersQuery(), []);

  return (
    <div className="rounded-2xl border border-muted-foreground/20 bg-card/80 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 lg:px-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Order History</h3>
          <p className="text-xs text-muted-foreground">
            Latest orders across POS and reseller channels
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 rounded-full px-4 text-xs">
          <Link href="/dashboard/pos">View POS</Link>
        </Button>
      </div>

      <div className="rounded-b-2xl border-t border-muted-foreground/20">
        <DataTable
          key={`dashboard-orders-table-${range}`}
          columns={columns}
          queryHook={queryHook}
          initialFilters={{
            page: 1,
            pageSize,
            range,
          }}
          getRowId={(row) => row.id}
          loadingMessage="Memuat riwayat order..."
          emptyMessage="Belum ada order pada rentang ini."
          renderToolbar={() => null}
        />
      </div>
    </div>
  );
}
