import { apiRequest, type ApiResult } from "@/lib/api/client";

import { mapCategoryRow } from "../data/dto";
import type { MenuCategory } from "../types";
import type {
  CreateMenuCategoryPayload,
  MenuCategoryFilters,
  UpdateMenuCategoryPayload,
} from "./forms/schema";

export type MenuCategoryListMeta = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters?: Record<string, unknown> | null;
};

export type MenuCategoryListResponse = {
  items: Array<{
    id: string;
    name: string;
    slug: string;
    sort_order: number | null;
    is_active: boolean;
    icon_url: string | null;
    created_at: string;
  }>;
};

export async function listMenuCategories(
  filters: MenuCategoryFilters,
): Promise<{ items: MenuCategory[]; meta: MenuCategoryListMeta | null }> {
  const searchParams = new URLSearchParams();
  if (filters.search) {
    searchParams.set("search", filters.search);
  }
  if (filters.status && filters.status !== "all") {
    searchParams.set("status", filters.status);
  }

  const query = searchParams.toString();
  const url = query ? `/api/menu-categories?${query}` : "/api/menu-categories";
  const { data, meta } = await apiRequest<MenuCategoryListResponse>(url);

  return {
    items: data.items.map(mapCategoryRow),
    meta: (meta as MenuCategoryListMeta | null) ?? null,
  };
}

export async function createMenuCategory(
  input: CreateMenuCategoryPayload,
): Promise<MenuCategory> {
  const { data }: ApiResult<MenuCategory> = await apiRequest(
    "/api/menu-categories",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return mapCategoryRow(data as Parameters<typeof mapCategoryRow>[0]);
}

export async function updateMenuCategory(
  categoryId: string,
  input: UpdateMenuCategoryPayload,
): Promise<MenuCategory> {
  const { data }: ApiResult<MenuCategory> = await apiRequest(
    `/api/menu-categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return mapCategoryRow(data as Parameters<typeof mapCategoryRow>[0]);
}

export async function deleteMenuCategory(categoryId: string): Promise<void> {
  await apiRequest(`/api/menu-categories/${categoryId}` as const, {
    method: "DELETE",
    parseJson: false,
  });
}
