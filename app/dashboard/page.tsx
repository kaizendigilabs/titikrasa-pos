import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { getDateRange, type DateRangeType } from "@/lib/utils/date-helpers";
import { fetchDashboardOrders, fetchDashboardSummary } from "@/features/dashboard/server";
import { DashboardOverviewClient } from "./DashboardOverviewClient";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import type { DashboardRangePayload } from "@/features/dashboard/types";
import { createQueryClient } from "@/lib/query";
import { dashboardOrdersQueryKey, dashboardSummaryQueryKey } from "@/features/dashboard/queries";
import { DASHBOARD_ORDER_HISTORY_PAGE_SIZE } from "@/features/dashboard/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await requireActor();
  ensureStaffOrAbove(actor.roles);

  const initialRange: DateRangeType = "month";
  const range = getDateRange(initialRange);

  const payload: DashboardRangePayload = {
    range: initialRange,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
    granularity: range.granularity,
  };

  const [summary, ordersBootstrap] = await Promise.all([
    fetchDashboardSummary(actor, payload),
    fetchDashboardOrders(actor, {
      payload,
      page: 1,
      pageSize: DASHBOARD_ORDER_HISTORY_PAGE_SIZE,
    }),
  ]);

  const queryClient = createQueryClient();

  queryClient.setQueryData(dashboardSummaryQueryKey(initialRange), summary);
  queryClient.setQueryData(
    dashboardOrdersQueryKey({
      range: initialRange,
      page: 1,
      pageSize: DASHBOARD_ORDER_HISTORY_PAGE_SIZE,
    }),
    {
      items: ordersBootstrap.items,
      meta: {
        pagination: ordersBootstrap.pagination,
      },
    },
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardOverviewClient initialRange={initialRange} />
    </HydrationBoundary>
  );
}
