import { z } from "zod";

export const createCashFlowSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  categoryId: z.string().uuid("Invalid category"),
  description: z.string().optional(),
});

export type CreateCashFlowSchema = z.infer<typeof createCashFlowSchema>;

export const updateCashFlowSchema = createCashFlowSchema.partial();

export type UpdateCashFlowSchema = z.infer<typeof updateCashFlowSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["in", "out"]),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
