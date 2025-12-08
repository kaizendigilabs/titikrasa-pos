import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_POLICIES } from "@/lib/api/cache-policies";
import { createBrowserClient } from "@/lib/supabase/client";

import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";
import type { DateRangeType } from "@/lib/utils/date-helpers";
import type { DashboardTransaction } from "./types";
import {
  fetchDashboardSummary,
  fetchDashboardOrders,
  type DashboardOrdersQueryParams,
} from "./client";
import {
  dashboardSummaryQueryKey,
  dashboardOrdersQueryKey,
} from "./keys";

// Re-export query keys for external usage
export { dashboardSummaryQueryKey, dashboardOrdersQueryKey } from "./keys";

/**
 * Hook for fetching dashboard summary metrics
 */
export function useDashboardSummary(range: DateRangeType) {
  return useQuery({
    queryKey: dashboardSummaryQueryKey(range),
    queryFn: () => fetchDashboardSummary(range),
    ...CACHE_POLICIES.FREQUENT,
    retry: 1,
  });
}

/**
 * Hook for fetching dashboard orders
 */
export function useDashboardOrders(
  params: DashboardOrdersQueryParams,
  options?: { initialData?: DataTableQueryResult<DashboardTransaction> },
) {
  return useQuery({
    queryKey: dashboardOrdersQueryKey(params),
    queryFn: () => fetchDashboardOrders(params),
    ...CACHE_POLICIES.FREQUENT,
    initialData: options?.initialData,
  });
}

/**
 * Hook for real-time dashboard updates via Supabase
 */
export function useDashboardRealtime(range: DateRangeType) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`dashboard-orders-${range}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey(range) });
          void queryClient.invalidateQueries({ queryKey: dashboardOrdersQueryKey({ range, page: 1, pageSize: 10 }) });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, range]);
}

