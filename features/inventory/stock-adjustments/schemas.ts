import { z } from "zod";

export const stockOpnameItemSchema = z.object({
  ingredientId: z.string().uuid(),
  countedQty: z.coerce.number().int().min(0),
});

export const createStockAdjustmentSchema = z.object({
  notes: z.string().trim().min(1, "Notes are required"),
  items: z.array(stockOpnameItemSchema).min(1, "At least one ingredient is required"),
  commit: z.boolean().optional().default(false),
});

export const updateStockAdjustmentSchema = z.object({
  action: z.enum(["approve"]),
});

export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>;
