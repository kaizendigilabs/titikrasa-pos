"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import DateRangeFilter from "@/components/shared/DateRangeFilter";
import { getDateRange, type DateRangeType } from "@/lib/utils/date-helpers";
import { MetricCards } from "@/components/shared/MetricCards";
import { SalesOverviewChart } from "@/components/shared/SalesOverviewChart";
import type {
  DashboardSummary,
  DashboardMetricSummary,
  DashboardChartPoint,
  DashboardTransaction,
} from "@/features/dashboard/types";
import { formatCurrency } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DashboardOverviewClientProps = {
  initialRange: DateRangeType;
  initialSummary: DashboardSummary;
};

const DEFAULT_SUMMARY: DashboardSummary = {
  metrics: {
    revenue: 0,
    expenses: 0,
    aov: 0,
    netProfit: 0,
    totalOrders: 0,
    paidOrders: 0,
    unpaidOrders: 0,
    voidOrders: 0,
    kdsPending: 0,
    lowStockCount: 0,
    resellerReceivables: 0,
    pendingPurchaseOrders: 0,
  },
  chart: [],
  transactions: [],
  lowStock: [],
  receivables: [],
  pendingPurchaseOrders: [],
};

export function DashboardOverviewClient({
  initialRange,
  initialSummary,
}: DashboardOverviewClientProps) {
  const [dateRange, setDateRange] = useState<DateRangeType>(initialRange);
  const [metrics, setMetrics] = useState<DashboardMetricSummary>(
    initialSummary.metrics ?? DEFAULT_SUMMARY.metrics,
  );
  const [chartData, setChartData] = useState<DashboardChartPoint[]>(
    initialSummary.chart ?? DEFAULT_SUMMARY.chart,
  );
  const [transactions, setTransactions] = useState<DashboardTransaction[]>(
    initialSummary.transactions ?? DEFAULT_SUMMARY.transactions,
  );
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const searchParams = useSearchParams();
  const toastHandledRef = useRef(false);
  const initialFetchRef = useRef(true);

  useEffect(() => {
    if (toastHandledRef.current) return;
    const status = searchParams.get("status");
    const message = searchParams.get("message");
    if (status === "forbidden") {
      toast.error(message ?? "You do not have permission to access this resource");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("status");
      params.delete("message");
      router.replace(`/dashboard${params.toString() ? `?${params.toString()}` : ""}`);
      toastHandledRef.current = true;
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (initialFetchRef.current) {
      initialFetchRef.current = false;
      return;
    }

    const controller = new AbortController();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/metrics?range=${dateRange}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload?.error?.message ?? "Failed to load dashboard data");
        }

        const payload = (await response.json()) as { summary: DashboardSummary };
        const summary = payload.summary ?? DEFAULT_SUMMARY;
        setMetrics(summary.metrics);
        setChartData(summary.chart);
        setTransactions(summary.transactions);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("[DASHBOARD_FETCH_ERROR]", error);
        toast.error(error instanceof Error ? error.message : "Failed to refresh dashboard data");
      }
    });

    return () => {
      controller.abort();
    };
  }, [dateRange, initialRange]);

  const { start, end } = getDateRange(dateRange);
  const rangeLabel = `${start.toLocaleDateString()} — ${end.toLocaleDateString()}`;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6 space-y-2">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <p className="text-sm text-muted-foreground">Showing data for {rangeLabel}</p>
          </div>

          <MetricCards data={metrics} />

          <div className="px-4 lg:px-6">
            <SalesOverviewChart data={chartData} isLoading={isPending && chartData.length === 0} />
          </div>

          <div className="px-4 lg:px-6">
            <OrderHistoryTable
              transactions={transactions}
              isLoading={isPending && transactions.length === 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderHistoryTable({
  transactions,
  isLoading,
}: {
  transactions: DashboardTransaction[];
  isLoading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-muted-foreground/20 bg-card/80 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Order History</h3>
          <p className="text-xs text-muted-foreground">Latest orders across POS and reseller channels</p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 rounded-full px-4 text-xs">
          <Link href="/dashboard/pos">View POS</Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions recorded for this date range.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium text-foreground">{transaction.number}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{transaction.channel}</TableCell>
                <TableCell>
                  <Badge
                    variant={transaction.paymentStatus === "paid" ? "secondary" : "outline"}
                    className="rounded-full px-3 py-1 text-xs"
                  >
                    {transaction.paymentStatus.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(transaction.createdAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">
                  {formatCurrency(transaction.grandTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
