import { apiClient } from "@/lib/api/client";

import type { MenuFilters, MenuListItem } from "./types";

type ListMenusResponse = {
  items: MenuListItem[];
};

type CreateMenuInput =
  | {
      type: "simple";
      name: string;
      sku?: string | null;
      categoryId?: string | null;
      thumbnailUrl?: string | null;
      isActive?: boolean;
      price: number;
      resellerPrice?: number | null;
    }
  | {
      type: "variant";
      name: string;
      sku?: string | null;
      categoryId?: string | null;
      thumbnailUrl?: string | null;
      isActive?: boolean;
      variants: Record<string, unknown>;
    };

type UpdateMenuInput = Partial<{
  type: "simple" | "variant";
  name: string;
  sku: string | null;
  categoryId: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  price: number;
  resellerPrice: number | null;
  variants: Record<string, unknown>;
}>;

/**
 * Fetches a paginated list of menus with optional filtering
 */
export async function listMenus(filters: MenuFilters = {}) {
  const params: Record<string, string> = {};
  
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.type) params.type = filters.type;
  if (filters.page) params.page = String(filters.page);
  if (filters.pageSize) params.pageSize = String(filters.pageSize);

  const { data, meta } = await apiClient.get<ListMenusResponse>(
    "/api/menus",
    params
  );

  return {
    items: data.items,
    meta,
  };
}

/**
 * Fetches a single menu by ID
 */
export async function getMenu(menuId: string) {
  const { data } = await apiClient.get<MenuListItem>(`/api/menus/${menuId}`);
  return data;
}

/**
 * Creates a new menu
 */
export async function createMenu(input: CreateMenuInput) {
  const { data } = await apiClient.post<MenuListItem>("/api/menus", input);
  return data;
}

/**
 * Updates an existing menu
 */
export async function updateMenu(menuId: string, input: UpdateMenuInput) {
  const { data } = await apiClient.patch<MenuListItem>(
    `/api/menus/${menuId}`,
    input
  );
  return data;
}

/**
 * Deletes a menu
 */
export async function deleteMenu(menuId: string) {
  const { data } = await apiClient.delete<{ success: boolean }>(
    `/api/menus/${menuId}`
  );
  return data;
}

/**
 * Publishes or unpublishes a menu
 */
export async function publishMenu(menuId: string, isActive: boolean) {
  const { data } = await apiClient.post<MenuListItem>(
    `/api/menus/${menuId}/publish`,
    { isActive }
  );
  return data;
}
