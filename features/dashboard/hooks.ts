import { useQuery } from "@tanstack/react-query";

import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";
import type { DateRangeType } from "@/lib/utils/date-helpers";
import type { DashboardTransaction } from "./types";
import {
  dashboardOrdersQueryOptions,
  dashboardSummaryQueryOptions,
  type DashboardOrdersQueryParams,
} from "./queries";

export function useDashboardSummary(range: DateRangeType) {
  return useQuery(dashboardSummaryQueryOptions(range));
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
