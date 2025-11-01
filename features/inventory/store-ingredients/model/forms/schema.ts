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
});

export const updateStoreIngredientSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .max(64, "SKU maksimal 64 karakter")
      .or(z.literal(""))
      .nullable()
      .optional(),
    minStock: z.coerce.number().int().min(0, "Minimal stok tidak valid").optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.sku !== undefined ||
      value.minStock !== undefined ||
      value.isActive !== undefined,
    "Tidak ada perubahan yang dikirim",
  )
  .transform((value) => ({
    ...value,
    sku:
      value.sku === undefined
        ? undefined
        : value.sku === "" || value.sku === null
          ? null
          : value.sku,
  }));

export type StoreIngredientFilters = z.infer<typeof storeIngredientFiltersSchema>;
export type PurchaseHistoryFilters = z.infer<typeof purchaseHistoryFiltersSchema>;
export type UpdateStoreIngredientPayload = z.infer<typeof updateStoreIngredientSchema>;

export const storeIngredientFormSchema = z.object({
  sku: z.string().trim().max(64, "SKU maksimal 64 karakter").or(z.literal("")),
  minStock: z.string().trim().regex(/^\d+$/, "Masukkan angka yang valid"),
  isActive: z.boolean(),
});

export type StoreIngredientFormValues = z.infer<typeof storeIngredientFormSchema>;
