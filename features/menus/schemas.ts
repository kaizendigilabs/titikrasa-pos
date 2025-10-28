import { z } from "zod";

import { MENU_SIZES, MENU_TEMPERATURES } from "./types";

export const menuFiltersSchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  categoryId: z.string().uuid().optional(),
  type: z.enum(["all", "simple", "variant"]).default("all"),
});

const skuRegex = /^[A-Za-z0-9_-]*$/;

const imageUrlSchema = z.union([
  z
    .string()
    .trim()
    .url("URL thumbnail tidak valid"),
  z.literal(""),
  z.null(),
]);

const temperaturePricesSchema = z
  .object({
    hot: z
      .coerce.number()
      .int("Harga harus bilangan bulat")
      .min(0, "Harga minimal 0")
      .nullable()
      .optional(),
    ice: z
      .coerce.number()
      .int("Harga harus bilangan bulat")
      .min(0, "Harga minimal 0")
      .nullable()
      .optional(),
  })
  .partial();

const variantPricesSchema = z
  .object({
    s: temperaturePricesSchema.optional(),
    m: temperaturePricesSchema.optional(),
    l: temperaturePricesSchema.optional(),
  })
  .partial();

export const menuVariantsSchema = z
  .object({
    allowedSizes: z.array(z.enum(MENU_SIZES)).min(1, "Pilih minimal 1 size"),
    allowedTemperatures: z
      .array(z.enum(MENU_TEMPERATURES))
      .min(1, "Pilih minimal 1 temperature"),
    defaultSize: z.enum(MENU_SIZES).nullable().optional(),
    defaultTemperature: z.enum(MENU_TEMPERATURES).nullable().optional(),
    prices: z.object({
      retail: variantPricesSchema,
      reseller: variantPricesSchema,
    }),
  })
  .superRefine((value, ctx) => {
    if (
      value.defaultSize &&
      !value.allowedSizes.includes(value.defaultSize)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Default size harus ada di daftar size",
        path: ["defaultSize"],
      });
    }
    if (
      value.defaultTemperature &&
      !value.allowedTemperatures.includes(value.defaultTemperature)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Default temperature harus ada di daftar temperature",
        path: ["defaultTemperature"],
      });
    }
  });

const baseMenuSchema = z.object({
  name: z.string().trim().min(1, "Nama menu wajib diisi"),
  sku: z
    .string()
    .trim()
    .max(64, "SKU maksimal 64 karakter")
    .regex(
      skuRegex,
      "SKU hanya boleh berisi huruf, angka, underscore, atau strip",
    )
    .optional()
    .nullable(),
  categoryId: z.string().uuid().nullable().optional(),
  thumbnailUrl: imageUrlSchema.optional(),
  isActive: z.boolean().optional(),
});

const simpleMenuSchema = baseMenuSchema.extend({
  type: z.literal("simple"),
  price: z
    .coerce.number()
    .int("Harga retail harus bilangan bulat")
    .min(0, "Harga retail minimal 0"),
  resellerPrice: z
    .coerce.number()
    .int("Harga reseller harus bilangan bulat")
    .min(0, "Harga reseller minimal 0")
    .nullable()
    .optional(),
});

const variantMenuSchema = baseMenuSchema.extend({
  type: z.literal("variant"),
  variants: menuVariantsSchema,
});

export const createMenuSchema = z
  .discriminatedUnion("type", [simpleMenuSchema, variantMenuSchema])
  .transform((value) => ({
    ...value,
    thumbnailUrl:
      value.thumbnailUrl === "" || value.thumbnailUrl === undefined
        ? null
        : value.thumbnailUrl,
    isActive: value.isActive ?? true,
    categoryId:
      value.categoryId === "" || value.categoryId === undefined
        ? null
        : value.categoryId,
  }));

export const updateMenuSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    sku: z
      .string()
      .trim()
      .max(64)
      .regex(
        skuRegex,
        "SKU hanya boleh berisi huruf, angka, underscore, atau strip",
      )
      .nullable()
      .optional(),
    categoryId: z.string().uuid().nullable().optional(),
    thumbnailUrl: imageUrlSchema.optional(),
    isActive: z.boolean().optional(),
    price: z.coerce.number().int().min(0).optional(),
    resellerPrice: z
      .coerce.number()
      .int()
      .min(0)
      .nullable()
      .optional(),
    variants: menuVariantsSchema.optional(),
    type: z.enum(["simple", "variant"]).optional(),
  })
  .transform((value) => ({
    ...value,
    thumbnailUrl:
      value.thumbnailUrl === "" ? null : value.thumbnailUrl,
    categoryId:
      value.categoryId === "" ? null : value.categoryId,
  }));

export type MenuVariantsInput = z.infer<typeof menuVariantsSchema>;
