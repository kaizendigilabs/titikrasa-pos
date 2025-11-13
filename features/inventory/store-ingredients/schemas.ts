import { z } from "zod";

export const storeIngredientFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(25),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  search: z.string().trim().optional(),
  lowStockOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true")
    .optional(),
});

export const purchaseHistoryFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(25),
  supplierId: z.string().uuid().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export type StoreIngredientFilters = z.infer<typeof storeIngredientFiltersSchema>;
export type PurchaseHistoryFilters = z.infer<typeof purchaseHistoryFiltersSchema>;

export const updateStoreIngredientSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .max(64)
      .or(z.literal(""))
      .optional(),
    minStock: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => data.sku !== undefined || data.minStock !== undefined || data.isActive !== undefined,
    "At least one field must be provided",
  )
  .transform((value) => ({
    ...value,
    sku: value.sku !== undefined ? (value.sku.trim().length > 0 ? value.sku.trim() : null) : undefined,
  }));

export type UpdateStoreIngredientInput = z.infer<typeof updateStoreIngredientSchema>;
