import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  catalogItemId: z.string().uuid(),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().int().min(0).optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  status: z.enum(["draft", "pending", "complete"]).default("draft"),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
  totals: z.record(z.string(), z.unknown()).optional(),
  issuedAt: z.string().trim().optional(),
});

export const updatePurchaseOrderSchema = z
  .object({
    status: z.enum(["draft", "pending", "complete"]).optional(),
    items: z.array(purchaseOrderItemSchema).min(1).optional(),
    totals: z.record(z.string(), z.unknown()).optional(),
    issuedAt: z.string().trim().optional(),
    completedAt: z.string().trim().optional(),
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: "No changes provided",
  });

const dateFilterSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || !Number.isNaN(Date.parse(value)),
    "Invalid date value",
  );

export const purchaseOrderFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(50),
  status: z.enum(["all", "draft", "pending", "complete"]).default("all"),
  search: z.string().trim().optional(),
  supplierId: z.string().uuid().optional(),
  issuedFrom: dateFilterSchema,
  issuedTo: dateFilterSchema,
});

export type PurchaseOrderItemPayload = z.infer<typeof purchaseOrderItemSchema>;
export type CreatePurchaseOrderPayload = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderPayload = z.infer<typeof updatePurchaseOrderSchema>;
export type PurchaseOrderFilters = z.infer<typeof purchaseOrderFiltersSchema>;
