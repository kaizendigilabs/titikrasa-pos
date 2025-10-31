import { NextRequest } from "next/server";
import { z } from "zod";

import { fetchDashboardSummary } from "@/features/dashboard/server";
import type { DashboardRangePayload } from "@/features/dashboard/types";
import { getDateRange, type DateRangeType } from "@/lib/utils/date-helpers";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const querySchema = z.object({
  range: z.union([
    z.literal("today"),
    z.literal("week"),
    z.literal("month"),
    z.literal("year"),
  ]),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { range } = querySchema.parse(params);
    const rangeResult = getDateRange(range as DateRangeType);

    const payload: DashboardRangePayload = {
      range,
      start: rangeResult.start.toISOString(),
      end: rangeResult.end.toISOString(),
      granularity: rangeResult.granularity,
    };

    const summary = await fetchDashboardSummary(actor, payload);
    return ok({ summary });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }

    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Date range parameter is invalid",
          details: { issues: error.issues },
        }),
      );
    }

    return fail(error);
  }
}
