import { apiClient } from "@/lib/api/client";

import type { MenuCategory, MenuCategoryFilters } from "./types";

type ListCategoriesResponse = {
  items: MenuCategory[];
};

type CreateCategoryInput = {
  name: string;
  slug: string;
  iconUrl?: string | null;
  sortOrder?: number | null;
  isActive?: boolean;
};

type UpdateCategoryInput = Partial<{
  name: string;
  slug: string;
  iconUrl: string | null;
  sortOrder: number | null;
  isActive: boolean;
}>;

/**
 * Fetches a paginated list of menu categories
 */
export async function listMenuCategories(filters: MenuCategoryFilters = {}) {
  const params: Record<string, string> = {};
  
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.page) params.page = String(filters.page);
  if (filters.pageSize) params.pageSize = String(filters.pageSize);

  const { data, meta } = await apiClient.get<ListCategoriesResponse>(
    "/api/menu-categories",
    params
  );

  return {
    items: data.items,
    meta,
  };
}

/**
 * Creates a new menu category
 */
export async function createMenuCategory(input: CreateCategoryInput) {
  const { data } = await apiClient.post<MenuCategory>(
    "/api/menu-categories",
    input
  );
  return data;
}

/**
 * Updates an existing menu category
 */
export async function updateMenuCategory(
  categoryId: string,
  input: UpdateCategoryInput,
) {
  const { data } = await apiClient.patch<MenuCategory>(
    `/api/menu-categories/${categoryId}`,
    input
  );
  return data;
}

/**
 * Deletes a menu category
 */
export async function deleteMenuCategory(categoryId: string) {
  const { data } = await apiClient.delete<{ success: boolean }>(
    `/api/menu-categories/${categoryId}`
  );
  return data;
}
