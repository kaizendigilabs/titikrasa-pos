import { useEffect, useMemo } from "react";
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

const SNAPSHOT_PREFIX = "dashboard-summary-snapshot";

function getSnapshotKey(range: DateRangeType) {
  return `${SNAPSHOT_PREFIX}-${range}`;
}

function loadSnapshot(range: DateRangeType): DashboardSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getSnapshotKey(range));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { summary: DashboardSummary };
    return parsed.summary;
  } catch (error) {
    console.warn("Failed to parse dashboard snapshot", error);
    return null;
  }
}

function persistSnapshot(range: DateRangeType, summary: DashboardSummary) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getSnapshotKey(range), JSON.stringify({ summary }));
  } catch (error) {
    console.warn("Failed to persist dashboard snapshot", error);
  }
}

export function useDashboardSummary(range: DateRangeType) {
  const snapshot = useMemo(() => loadSnapshot(range), [range]);
  const baseOptions = dashboardSummaryQueryOptions(range);

  const query = useQuery({
    ...baseOptions,
    ...(snapshot ? { initialData: snapshot } : {}),
  });

  useEffect(() => {
    if (query.data) {
      persistSnapshot(range, query.data);
    }
  }, [query.data, range]);

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
