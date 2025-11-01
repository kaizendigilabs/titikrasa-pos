import { z } from "zod";

export const menuCategoryFiltersSchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
});

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const iconInputSchema = z.union([
  z
    .string()
    .trim()
    .url("URL ikon tidak valid"),
  z.literal(""),
  z.null(),
]);

export const createMenuCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Nama kategori wajib diisi"),
    slug: z
      .string()
      .trim()
      .min(1, "Slug wajib diisi")
      .regex(
        slugRegex,
        "Slug hanya boleh berisi huruf kecil, angka, dan tanda minus (-)",
      ),
    iconUrl: iconInputSchema.optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .transform((value) => ({
    ...value,
    iconUrl:
      value.iconUrl === "" || value.iconUrl === undefined
        ? null
        : value.iconUrl,
    isActive: value.isActive ?? true,
  }));

export const updateMenuCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Nama kategori wajib diisi").optional(),
    slug: z
      .string()
      .trim()
      .min(1, "Slug wajib diisi")
      .regex(
        slugRegex,
        "Slug hanya boleh berisi huruf kecil, angka, dan tanda minus (-)",
      )
      .optional(),
    iconUrl: iconInputSchema.optional(),
    sortOrder: z.coerce.number().int().min(0).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .transform((value) => ({
    ...value,
    iconUrl:
      value.iconUrl === "" ? null : value.iconUrl,
  }));


export type MenuCategoryFilters = z.infer<typeof menuCategoryFiltersSchema>;
export type CreateMenuCategoryPayload = z.infer<typeof createMenuCategorySchema>;
export type UpdateMenuCategoryPayload = z.infer<typeof updateMenuCategorySchema>;
