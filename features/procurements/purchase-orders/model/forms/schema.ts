import { z } from "zod";

export const purchaseOrderStatusSchema = z.enum(["draft", "pending", "complete"]);

export const purchaseOrderItemSchema = z.object({
  catalogItemId: z.string().uuid({ message: "Pilih item katalog" }),
  qty: z.coerce
    .number({ invalid_type_error: "Jumlah harus berupa angka" })
    .int({ message: "Jumlah harus bulat" })
    .min(1, "Jumlah minimal 1"),
  price: z.coerce
    .number({ invalid_type_error: "Harga harus berupa angka" })
    .int({ message: "Harga harus bulat" })
    .min(0, "Harga minimal 0")
    .optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid({ message: "Pilih supplier" }),
  status: purchaseOrderStatusSchema.default("draft"),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, "Tambahkan minimal satu item katalog"),
  totals: z.record(z.string(), z.unknown()).optional(),
  issuedAt: z
    .string({ invalid_type_error: "Tanggal terbit tidak valid" })
    .trim()
    .optional(),
});

export const updatePurchaseOrderSchema = z
  .object({
    status: purchaseOrderStatusSchema.optional(),
    totals: z.record(z.string(), z.unknown()).optional(),
    issuedAt: z
      .string({ invalid_type_error: "Tanggal terbit tidak valid" })
      .trim()
      .optional(),
    completedAt: z
      .string({ invalid_type_error: "Tanggal selesai tidak valid" })
      .trim()
      .optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Tidak ada perubahan",
  });

export const purchaseOrderFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(25),
  status: z
    .union([purchaseOrderStatusSchema, z.literal("all")])
    .default("all"),
  search: z
    .string({ invalid_type_error: "Pencarian tidak valid" })
    .trim()
    .optional(),
});

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type PurchaseOrderFilters = z.infer<typeof purchaseOrderFiltersSchema>;
