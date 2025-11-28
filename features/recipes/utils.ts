import type { RecipeListItem } from "./types";
import type { RecipeItem, RecipeMethodStep } from "./types";
import type { TablesInsert } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/formatters";

type RecipesTableInsert = TablesInsert<"recipes">;
type VariantOverrideInsert = TablesInsert<"recipe_variant_overrides">;

export type CreateRecipeInput = {
  menuId: string;
  version: number;
  effectiveFrom?: string | null;
  items: Array<{
    ingredientId: string;
    quantity: number;
    uom: string;
  }>;
  methodSteps?: Array<{
    stepNo: number;
    instruction: string;
  }>;
  variantOverrides?: Array<{
    size: string;
    temperature: string;
    items: Array<{
      ingredientId: string;
      quantity: number;
      uom: string;
    }>;
  }>;
};

export function toRecipeInsertPayload(input: CreateRecipeInput): RecipesTableInsert {
  return {
    menu_id: input.menuId,
    version: input.version,
    effective_from: input.effectiveFrom ?? new Date().toISOString(),
    items: serializeRecipeItems(input.items),
    method_steps: serializeMethodSteps(input.methodSteps ?? []),
  };
}

export function serializeRecipeItems(items: CreateRecipeInput["items"]) {
  return items.map((item) => ({
    ingredient_id: item.ingredientId,
    qty: item.quantity,
    uom: item.uom,
  }));
}

export function serializeMethodSteps(steps: NonNullable<CreateRecipeInput["methodSteps"]>) {
  return steps
    .map((step) => ({
      step_no: step.stepNo,
      instruction: step.instruction,
    }))
    .sort((a, b) => a.step_no - b.step_no);
}

export function toVariantOverridePayload(
  menuId: string,
  version: number,
  overrides: NonNullable<CreateRecipeInput["variantOverrides"]>,
): VariantOverrideInsert[] {
  return overrides.map((override) => ({
    menu_id: menuId,
    version,
    size: override.size,
    temperature: override.temperature,
    items: serializeRecipeItems(override.items),
  }));
}

export function mapRecipeToFormValues(recipe: RecipeListItem) {
  return {
    menuId: recipe.menuId,
    version: recipe.version,
    effectiveFrom: recipe.effectiveFrom,
    items: recipe.items.map(mapItemToForm),
    methodSteps: recipe.methodSteps.map(mapStepToForm),
    variantOverrides: recipe.overrides.map((override) => ({
      size: override.size,
      temperature: override.temperature,
      items: override.items.map(mapItemToForm),
    })),
  };
}

function mapItemToForm(item: RecipeItem) {
  return {
    ingredientId: item.ingredientId,
    quantity: item.quantity,
    uom: item.uom,
    ingredientName: item.ingredientName ?? null,
  };
}

function mapStepToForm(step: RecipeMethodStep) {
  return {
    stepNo: step.step_no,
    instruction: step.instruction,
  };
}

export function formatRecipeVersion(version: number) {
  return `v${version}`;
}

export function formatIngredientLine(item: RecipeItem) {
  return `${item.ingredientName ?? "Ingredient"} — ${item.quantity} ${item.uom}`;
}

export function summarizeRecipeCost(items: Array<{ quantity: number; price?: number }>) {
  const total = items.reduce(
    (sum, entry) => sum + entry.quantity * (entry.price ?? 0),
    0,
  );
  return formatCurrency(total / 100);
}
