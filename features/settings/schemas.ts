import { z } from "zod";

import type { DiscountMode, ReceiptAutoReset } from "./types";

export const discountModeSchema: z.ZodType<DiscountMode> = z.enum([
  "none",
  "percentage",
  "nominal",
]);

export const receiptAutoResetSchema: z.ZodType<ReceiptAutoReset> = z.enum([
  "none",
  "daily",
]);

export const taxSettingsSchema = z.object({
  rate: z
    .number()
    .min(0, "Tarif pajak minimal 0%")
    .max(0.3, "Tarif pajak maksimal 30%"),
  autoApply: z.boolean().default(true),
});

export const discountSettingsSchema = z.object({
  mode: discountModeSchema,
  value: z
    .number()
    .min(0, "Nilai diskon tidak boleh negatif"),
});

export const storeProfileSettingsSchema = z.object({
  name: z.string().min(1, "Nama toko wajib diisi"),
  address: z.string().min(1, "Alamat wajib diisi"),
  phone: z.string().min(3, "Nomor telepon minimal 3 karakter"),
  logoUrl: z.string().url("URL logo tidak valid").or(z.null()).optional(),
  footerNote: z.string().max(160, "Catatan maks. 160 karakter").or(z.null()).optional(),
});

export const receiptNumberingSettingsSchema = z.object({
  posPrefix: z
    .string()
    .min(2, "Minimal 2 karakter")
    .max(6, "Maksimal 6 karakter")
    .regex(/^[A-Z0-9]+$/, "Gunakan huruf kapital/angka"),
  resellerPrefix: z
    .string()
    .min(2, "Minimal 2 karakter")
    .max(6, "Maksimal 6 karakter")
    .regex(/^[A-Z0-9]+$/, "Gunakan huruf kapital/angka"),
  padding: z
    .number()
    .int()
    .min(3, "Minimal 3 digit")
    .max(6, "Maksimal 6 digit"),
  autoReset: receiptAutoResetSchema,
});

export const settingsUpdateSchema = z
  .object({
    tax: taxSettingsSchema.optional(),
    discount: discountSettingsSchema.optional(),
    storeProfile: storeProfileSettingsSchema.optional(),
    receiptNumbering: receiptNumberingSettingsSchema.optional(),
  })
  .refine(
    (value) =>
      Boolean(value.tax || value.discount || value.storeProfile || value.receiptNumbering),
    {
      message: "Tidak ada perubahan yang dikirim",
      path: ["root"],
    },
  );

export type SettingsUpdateSchema = z.infer<typeof settingsUpdateSchema>;
