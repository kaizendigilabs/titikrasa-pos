import { NextRequest } from "next/server";

import { createStockAdjustment } from "@/features/inventory/stock-adjustments/server";
import { createStockAdjustmentSchema } from "@/features/inventory/stock-adjustments/schemas";
import type { CreateStockAdjustmentInput } from "@/features/inventory/stock-adjustments/schemas";
import { requireActor } from "@/features/users/server";
import { ok, fail } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor();
    const payload = (await request.json()) as CreateStockAdjustmentInput;
    const body = createStockAdjustmentSchema.parse(payload);
    const adjustment = await createStockAdjustment(actor, body);
    return ok({ adjustment });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error);
    }
    return fail(error);
  }
}
