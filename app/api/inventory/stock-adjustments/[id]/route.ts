import { NextRequest } from "next/server";

import { approveStockAdjustment } from "@/features/inventory/stock-adjustments/server";
import { updateStockAdjustmentSchema } from "@/features/inventory/stock-adjustments/schemas";
import { requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError, appError, ERR } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    const { id } = await params;

    if (!id) {
      throw appError(ERR.BAD_REQUEST, { message: "Missing adjustment id" });
    }

    const payload = await request.json();
    const body = updateStockAdjustmentSchema.parse(payload);

    if (body.action !== "approve") {
      throw appError(ERR.BAD_REQUEST, {
        message: "Unsupported action",
        details: { action: body.action },
      });
    }

    const adjustment = await approveStockAdjustment(actor, id);
    return ok({ adjustment });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
