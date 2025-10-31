import { getDateRange, type DateRangeType } from "@/lib/utils/date-helpers";
import { fetchDashboardSummary } from "@/features/dashboard/server";
import { DashboardOverviewClient } from "./DashboardOverviewClient";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import type { DashboardRangePayload } from "@/features/dashboard/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await requireActor();
  ensureStaffOrAbove(actor.roles);

  const initialRange: DateRangeType = "today";
  const range = getDateRange(initialRange);

  const payload: DashboardRangePayload = {
    range: initialRange,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
    granularity: range.granularity,
  };

  const summary = await fetchDashboardSummary(actor, payload);

  return (
    <DashboardOverviewClient
      initialRange={initialRange}
      initialSummary={summary}
    />
  );
}
