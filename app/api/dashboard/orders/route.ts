import { NextRequest } from "next/server";
import { z } from "zod";

import { fetchDashboardOrders } from "@/features/dashboard/server";
import { ensureStaffOrAbove, requireActor } from "@/features/users/server";
import { getDateRange, type DateRangeType } from "@/lib/utils/date-helpers";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, ERR, appError } from "@/lib/utils/errors";

const querySchema = z.object({
  range: z.union([
    z.literal("today"),
    z.literal("week"),
    z.literal("month"),
    z.literal("year"),
  ]),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor();
    ensureStaffOrAbove(actor.roles);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { range, page, pageSize } = querySchema.parse(params);

    const rangeResult = getDateRange(range as DateRangeType);
    const payload = {
      range,
      start: rangeResult.start.toISOString(),
      end: rangeResult.end.toISOString(),
      granularity: rangeResult.granularity,
    };

    const result = await fetchDashboardOrders(actor, {
      payload,
      page,
      pageSize,
    });

    return ok(result.items, {
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    if (error instanceof z.ZodError) {
      return fail(
        appError(ERR.VALIDATION_ERROR, {
          message: "Parameter riwayat order tidak valid",
          details: { issues: error.issues },
        }),
      );
    }
    return fail(error);
  }
}
