import { apiClient } from "@/lib/api/client";

import type { RecipeFilters, RecipeListItem, RecipeListResponse } from "./types";

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

type RecipeResponse = {
  recipe: RecipeListItem;
};

/**
 * Fetches a paginated list of recipes
 */
export async function listRecipes(filters: RecipeFilters = {}) {
  const params: Record<string, string> = {};
  
  if (filters.search) params.search = filters.search;
  if (filters.menuId) params.menuId = filters.menuId;
  if (filters.page) params.page = String(filters.page);
  if (filters.pageSize) params.pageSize = String(filters.pageSize);

  const { data, meta } = await apiClient.get<RecipeListResponse>(
    "/api/recipes",
    params
  );

  return {
    recipes: data.recipes,
    meta,
  };
}

/**
 * Fetches a single recipe by ID
 */
export async function getRecipe(recipeId: string) {
  const { data } = await apiClient.get<RecipeResponse>(`/api/recipes/${recipeId}`);
  return data.recipe;
}

/**
 * Creates a new recipe
 */
export async function createRecipe(input: RecipeInput) {
  const { data } = await apiClient.post<RecipeResponse>("/api/recipes", input);
  return data.recipe;
}

/**
 * Updates an existing recipe
 */
export async function updateRecipe(recipeId: string, input: Partial<RecipeInput>) {
  const { data } = await apiClient.patch<RecipeResponse>(
    `/api/recipes/${recipeId}`,
    input
  );
  return data.recipe;
}

/**
 * Deletes a recipe
 */
export async function deleteRecipe(recipeId: string) {
  const { data } = await apiClient.delete<{ success: boolean }>(
    `/api/recipes/${recipeId}`
  );
  return data.success;
}

export type { RecipeInput };
