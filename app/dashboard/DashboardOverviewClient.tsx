"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconRefresh } from "@tabler/icons-react";

import DateRangeFilter from "@/components/shared/DateRangeFilter";
import { MetricCards } from "@/components/shared/MetricCards";
import { SalesOverviewChart } from "@/components/shared/SalesOverviewChart";
import type { DashboardSummary } from "@/features/dashboard/types";
import { type DateRangeType } from "@/lib/utils/date-helpers";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import { OrderHistoryTable } from "@/app/dashboard/_components/order-history-table";
import { DASHBOARD_ORDER_HISTORY_PAGE_SIZE } from "@/features/dashboard/constants";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/formatters";
import { ERROR_MESSAGES, type RedirectErrorCode } from "@/lib/utils/redirect-errors";

type DashboardOverviewClientProps = {
  initialRange: DateRangeType;
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
    lowStockCount: 0,
    resellerReceivables: 0,
    pendingPurchaseOrders: 0,
  },
  chart: [],
  transactions: [],
  lowStock: [],
  receivables: [],
  pendingPurchaseOrders: [],
  generatedAt: new Date().toISOString(),
};

export function DashboardOverviewClient({ initialRange }: DashboardOverviewClientProps) {
  const [range, setRange] = useState<DateRangeType>(initialRange);

  const router = useRouter();
  const searchParams = useSearchParams();
  const toastHandledRef = useRef(false);

  useEffect(() => {
    if (toastHandledRef.current) return;
    const error = searchParams.get("error") as RedirectErrorCode | null;
    if (error && ERROR_MESSAGES[error]) {
      toast.error(ERROR_MESSAGES[error]);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("error");
      router.replace(`/dashboard${params.toString() ? `?${params.toString()}` : ""}`);
      toastHandledRef.current = true;
    }
  }, [router, searchParams]);

  const summaryQuery = useDashboardSummary(range);
  
  const summary = summaryQuery.data ?? DEFAULT_SUMMARY;
  const isMetricsLoading = summaryQuery.isLoading && !summaryQuery.data;
  const isRefreshing = summaryQuery.isFetching || summaryQuery.isRefetching;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6 space-y-6">
            <div className="flex justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Selamat Datang, Owner
                </h1>
                <p className="text-muted-foreground">
                  Berikut adalah ringkasan performa bisnis Anda hari ini, {formatDateTime(new Date())}.
                </p>
              </div>

              <div className="flex flex-col gap-3 justify-between sm:flex-row sm:items-center rounded-2xl p-2">
                <DateRangeFilter value={range} onChange={setRange} />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={() => summaryQuery.refetch()}
                    disabled={isRefreshing}
                    className="gap-2 bg-background p-4.5"
                  >
                    <IconRefresh className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh Data
                  </Button>
                </div>
              </div>
            </div>

          </div>

          {isMetricsLoading ? (
            <Skeleton className="mx-4 h-32 rounded-2xl lg:mx-6" />
          ) : (
            <MetricCards data={summary.metrics} />
          )}

          <div className="px-4 lg:px-6">
            <SalesOverviewChart
              data={summary.chart}
              isLoading={summaryQuery.isFetching && !summaryQuery.data}
            />
          </div>

          <div className="px-4 lg:px-6">
            <OrderHistoryTable key={range} range={range} pageSize={DASHBOARD_ORDER_HISTORY_PAGE_SIZE} />
          </div>
        </div>
      </div>
    </div>
  );
}
