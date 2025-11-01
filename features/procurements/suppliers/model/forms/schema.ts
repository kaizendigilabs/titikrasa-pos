import { z } from "zod";

export const supplierContactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama kontak wajib diisi")
      .max(120)
      .optional(),
    email: z
      .string()
      .trim()
      .email("Email tidak valid")
      .max(120)
      .optional(),
    phone: z.string().trim().max(60).optional(),
    address: z.string().trim().max(255).optional(),
    note: z.string().trim().max(255).optional(),
  })
  .partial()
  .transform((value) =>
    Object.fromEntries(
      Object.entries(value).filter(([, val]) => val !== undefined && val !== ""),
    ),
  );

export const createSupplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama supplier wajib diisi")
    .max(200),
  contact: supplierContactSchema.optional(),
  isActive: z.boolean().optional(),
});

export const updateSupplierSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    contact: supplierContactSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: "Tidak ada perubahan yang dikirim",
  });

export const supplierFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
});

export const baseUomEnum = z.enum(["gr", "ml", "pcs"]);

export const createCatalogItemSchema = z.object({
  supplierId: z.string().uuid(),
  name: z.string().trim().min(1, "Nama item wajib diisi").max(200),
  baseUom: baseUomEnum,
  purchasePrice: z.coerce.number().int().min(0),
  isActive: z.boolean().optional(),
});

export const updateCatalogItemSchema = createCatalogItemSchema.partial().extend({
  supplierId: z.string().uuid().optional(),
});

export const createSupplierLinkSchema = z.object({
  supplierId: z.string().uuid(),
  catalogItemId: z.string().uuid(),
  storeIngredientId: z.string().uuid(),
  preferred: z.boolean().optional(),
});

export const updateSupplierLinkSchema = z.object({
  preferred: z.boolean(),
});

export type SupplierFilters = z.infer<typeof supplierFiltersSchema>;
export type CreateSupplierPayload = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierPayload = z.infer<typeof updateSupplierSchema>;
export type CreateCatalogItemPayload = z.infer<typeof createCatalogItemSchema>;
export type UpdateCatalogItemPayload = z.infer<typeof updateCatalogItemSchema>;
export type CreateSupplierLinkPayload = z.infer<typeof createSupplierLinkSchema>;
export type UpdateSupplierLinkPayload = z.infer<typeof updateSupplierLinkSchema>;
