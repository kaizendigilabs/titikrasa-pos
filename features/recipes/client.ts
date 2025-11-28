import { AppError, ERR } from "@/lib/utils/errors";

import type { RecipeFilters, RecipeListItem, RecipeListResponse } from "./types";

type ApiEnvelope<T> = {
  data: T;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

function buildParams(filters: RecipeFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.menuId) params.set("menuId", filters.menuId);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  return params.toString();
}

export async function listRecipes(filters: RecipeFilters = {}) {
  const query = buildParams(filters);
  const response = await fetch(`/api/recipes${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  let payload: ApiEnvelope<RecipeListResponse> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<RecipeListResponse>;
  } catch (error) {
    throw new AppError(
      ERR.SERVER_ERROR.statusCode,
      error instanceof Error ? error.message : "Unexpected response from server",
    );
  }

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Failed to load recipes",
    );
  }

  return {
    recipes: payload.data.recipes,
    meta: payload.meta,
  };
}

export async function getRecipe(recipeId: string) {
  const response = await fetch(`/api/recipes/${recipeId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  let payload: ApiEnvelope<{ recipe: RecipeListItem }> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<{ recipe: RecipeListItem }>;
  } catch (error) {
    throw new AppError(
      ERR.SERVER_ERROR.statusCode,
      error instanceof Error ? error.message : "Unexpected response from server",
    );
  }

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Failed to load recipe",
    );
  }

  return payload.data.recipe;
}

type RecipeInput = {
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

export async function createRecipe(input: RecipeInput) {
  const response = await fetch(`/api/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  let payload: ApiEnvelope<{ recipe: RecipeListItem }> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<{ recipe: RecipeListItem }>;
  } catch (error) {
    throw new AppError(
      ERR.SERVER_ERROR.statusCode,
      error instanceof Error ? error.message : "Unexpected response from server",
    );
  }

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Failed to create recipe",
    );
  }

  return payload.data.recipe;
}

export async function updateRecipe(recipeId: string, input: Partial<RecipeInput>) {
  const response = await fetch(`/api/recipes/${recipeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  let payload: ApiEnvelope<{ recipe: RecipeListItem }> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<{ recipe: RecipeListItem }>;
  } catch (error) {
    throw new AppError(
      ERR.SERVER_ERROR.statusCode,
      error instanceof Error ? error.message : "Unexpected response from server",
    );
  }

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Failed to update recipe",
    );
  }

  return payload.data.recipe;
}

export async function deleteRecipe(recipeId: string) {
  const response = await fetch(`/api/recipes/${recipeId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  let payload: ApiEnvelope<{ success: boolean }> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<{ success: boolean }>;
  } catch (error) {
    throw new AppError(
      ERR.SERVER_ERROR.statusCode,
      error instanceof Error ? error.message : "Unexpected response from server",
    );
  }

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Failed to delete recipe",
    );
  }

  return payload.data.success;
}

export type { RecipeInput };
