import { type ZodError } from "zod";

import type { StoreIngredientListItem } from "../../types";
import {
  storeIngredientFormSchema,
  updateStoreIngredientSchema,
  type StoreIngredientFormValues,
  type UpdateStoreIngredientPayload,
} from "./schema";

export type StoreIngredientFormState = StoreIngredientFormValues;

export type StoreIngredientFormErrors = {
  sku?: string;
  minStock?: string;
  form?: string;
};

export function createDefaultStoreIngredientFormState(): StoreIngredientFormState {
  return {
    sku: "",
    minStock: "0",
    isActive: true,
  };
}

export function mapStoreIngredientToFormState(
  ingredient: StoreIngredientListItem,
): StoreIngredientFormState {
  return {
    sku: ingredient.sku ?? "",
    minStock: String(ingredient.minStock ?? 0),
    isActive: ingredient.isActive,
  };
}

type FormResult =
  | { success: true; payload: UpdateStoreIngredientPayload }
  | { success: false; errors: StoreIngredientFormErrors };

function mapErrors(error: ZodError): StoreIngredientFormErrors {
  const errors: StoreIngredientFormErrors = {};
  for (const issue of error.errors) {
    const key = issue.path.join(".");
    switch (key) {
      case "sku":
        errors.sku = issue.message;
        break;
      case "minStock":
        errors.minStock = issue.message;
        break;
      default:
        errors.form = issue.message;
        break;
    }
  }
  return errors;
}

export function buildUpdateStoreIngredientInput(
  state: StoreIngredientFormState,
  original: StoreIngredientListItem,
): FormResult {
  const parsedForm = storeIngredientFormSchema.safeParse(state);
  if (!parsedForm.success) {
    return { success: false, errors: mapErrors(parsedForm.error) };
  }

  const parsedPayload = updateStoreIngredientSchema.safeParse({
    sku: parsedForm.data.sku,
    minStock: Number(parsedForm.data.minStock),
    isActive: parsedForm.data.isActive,
  });

  if (!parsedPayload.success) {
    return { success: false, errors: mapErrors(parsedPayload.error) };
  }

  const payload: UpdateStoreIngredientPayload = {};

  if (parsedPayload.data.sku !== undefined) {
    const nextSku = parsedPayload.data.sku;
    const originalSku = original.sku ?? null;
    if (nextSku !== originalSku) {
      payload.sku = nextSku;
    }
  }

  if (
    parsedPayload.data.minStock !== undefined &&
    parsedPayload.data.minStock !== original.minStock
  ) {
    payload.minStock = parsedPayload.data.minStock;
  }

  if (
    parsedPayload.data.isActive !== undefined &&
    parsedPayload.data.isActive !== original.isActive
  ) {
    payload.isActive = parsedPayload.data.isActive;
  }

  const result = updateStoreIngredientSchema.safeParse(payload);
  if (!result.success) {
    return { success: false, errors: mapErrors(result.error) };
  }

  return { success: true, payload: result.data };
}
