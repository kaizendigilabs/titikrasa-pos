import { z } from "zod";

const recipeIngredientSchema = z.object({
  ingredientId: z.string().uuid({ message: "Ingredient must be selected" }),
  quantity: z.coerce.number().nonnegative({ message: "Quantity must be positive" }),
  uom: z.string().trim().min(1, "Unit of measure is required"),
});

const recipeMethodStepSchema = z.object({
  stepNo: z.coerce.number().int().min(1, "Step must be at least 1"),
  instruction: z.string().trim().min(1, "Instruction is required"),
});

const recipeVariantOverrideSchema = z.object({
  size: z.string().trim().min(1, "Variant size is required"),
  temperature: z.string().trim().min(1, "Variant temperature is required"),
  items: z.array(recipeIngredientSchema).max(50, "Too many items in override"),
});

export const recipeFiltersSchema = z.object({
  search: z.string().trim().min(1).optional(),
  menuId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const createRecipeSchema = z.object({
  menuId: z.string().uuid(),
  version: z.coerce.number().int().min(1).default(1),
  effectiveFrom: z
    .string()
    .datetime({ offset: true })
    .or(z.string().trim().min(1))
    .optional(),
  items: z
    .array(recipeIngredientSchema)
    .min(1, "At least one ingredient is required")
    .max(200, "Too many ingredients"),
  methodSteps: z.array(recipeMethodStepSchema).optional().default([]),
  variantOverrides: z
    .array(recipeVariantOverrideSchema)
    .optional()
    .default([]),
});

export const updateRecipeSchema = z
  .object({
    menuId: z.string().uuid().optional(),
    version: z.coerce.number().int().min(1).optional(),
    effectiveFrom: z
      .string()
      .datetime({ offset: true })
      .or(z.string().trim().min(1))
      .optional(),
    items: z
      .array(recipeIngredientSchema)
      .min(1, "At least one ingredient is required")
      .max(200, "Too many ingredients")
      .optional(),
    methodSteps: z.array(recipeMethodStepSchema).optional(),
    variantOverrides: z.array(recipeVariantOverrideSchema).optional(),
  })
  .refine(
    (payload) =>
      !payload.variantOverrides ||
      payload.variantOverrides.every((override) => override.items.length > 0),
    {
      message: "Each variant override must include at least one ingredient",
      path: ["variantOverrides"],
    },
  );
