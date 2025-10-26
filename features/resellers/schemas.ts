import { z } from "zod";

export const contactSchema = z
  .object({
    phone: z.string().trim().min(3, "Phone too short").max(30).optional(),
    email: z.string().trim().email("Invalid email").optional(),
    address: z.string().trim().max(255).optional(),
    note: z.string().trim().max(255).optional(),
  })
  .partial()
  .transform((value) =>
    Object.fromEntries(
      Object.entries(value).filter(
        ([, val]) => val !== undefined && val !== "",
      ),
    ),
  );

export const termsSchema = z
  .object({
    paymentTermDays: z
      .union([z.number().int().min(0).max(365), z.nan()])
      .optional(),
    discountPercent: z
      .union([z.number().min(0).max(100), z.nan()])
      .optional(),
  })
  .partial()
  .transform((value) => {
    const next: Record<string, number> = {};
    if (
      value.paymentTermDays !== undefined &&
      !Number.isNaN(value.paymentTermDays)
    ) {
      next.paymentTermDays = value.paymentTermDays;
    }
    if (
      value.discountPercent !== undefined &&
      !Number.isNaN(value.discountPercent)
    ) {
      next.discountPercent = value.discountPercent;
    }
    return next;
  });

export const createResellerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  contact: contactSchema.optional(),
  terms: termsSchema.optional(),
  isActive: z.boolean().optional(),
});

export const updateResellerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120).optional(),
    contact: contactSchema.optional(),
    terms: termsSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (payload) => Object.values(payload).some((value) => value !== undefined),
    "No changes provided",
  );

export const resellerFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
});

export type CreateResellerPayload = z.infer<typeof createResellerSchema>;
export type UpdateResellerPayload = z.infer<typeof updateResellerSchema>;
export type ResellerFilters = z.infer<typeof resellerFiltersSchema>;
