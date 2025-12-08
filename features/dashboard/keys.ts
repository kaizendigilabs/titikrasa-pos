import type { DateRangeType } from "@/lib/utils/date-helpers";

const DASHBOARD_SUMMARY_KEY = "dashboard-summary";
const DASHBOARD_ORDERS_KEY = "dashboard-orders";

export type DashboardOrdersKeyParams = {
  range: DateRangeType;
  page: number;
  pageSize: number;
};

/**
 * Returns the dashboard summary query key for external invalidation
 */
export function dashboardSummaryQueryKey(range: DateRangeType) {
  return [DASHBOARD_SUMMARY_KEY, range] as const;
}

/**
 * Returns the dashboard orders query key for external invalidation
 */
export function dashboardOrdersQueryKey(params: DashboardOrdersKeyParams) {
  return [DASHBOARD_ORDERS_KEY, params.range, params.page, params.pageSize] as const;
}
