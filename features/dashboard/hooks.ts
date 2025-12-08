import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";
import type { DateRangeType } from "@/lib/utils/date-helpers";
import type { DashboardTransaction } from "./types";
import {
  dashboardOrdersQueryOptions,
  dashboardSummaryQueryOptions,
  dashboardSummaryQueryKey,
  type DashboardOrdersQueryParams,
} from "./queries";
import type { DashboardSummary } from "./types";
import { createBrowserClient } from "@/lib/supabase/client";


export function useDashboardSummary(range: DateRangeType) {
  const baseOptions = dashboardSummaryQueryOptions(range);

  const query = useQuery({
    ...baseOptions,
  });

  return query;
}

export function useDashboardOrders(
  params: DashboardOrdersQueryParams,
  options?: { initialData?: DataTableQueryResult<DashboardTransaction> },
) {
  return useQuery({
    ...dashboardOrdersQueryOptions(params),
    initialData: options?.initialData,
  });
}

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
          void queryClient.invalidateQueries({ queryKey: ["dashboard-orders", range] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, range]);
}
