import { apiRequest } from "@/lib/api/client";

import type { MenuFilters, MenuListItem } from "../types";

type ListMenusResponse = {
  items: MenuListItem[];
};

export async function listMenus(filters: MenuFilters = {}) {
  const searchParams = new URLSearchParams();
  if (filters.search) searchParams.set("search", filters.search);
  if (filters.status) searchParams.set("status", filters.status);
  if (filters.categoryId) searchParams.set("categoryId", filters.categoryId);
  if (filters.type) searchParams.set("type", filters.type);

  const query = searchParams.toString();
  const url = `/api/menus${query ? `?${query}` : ""}`;

  const response = await apiRequest<ListMenusResponse>(url, {
    method: "GET",
  });

  return {
    items: response.data.items,
    meta: response.meta,
  };
}

export async function getMenu(menuId: string) {
  const { data } = await apiRequest<MenuListItem>(`/api/menus/${menuId}`, {
    method: "GET",
  });
  return data;
}

type BaseMenuInput = {
  name: string;
  sku?: string | null;
  categoryId?: string | null;
  thumbnailUrl?: string | null;
  isActive?: boolean;
};

type SimpleMenuInput = BaseMenuInput & {
  type: "simple";
  price: number;
  resellerPrice?: number | null;
};

type VariantMenuInput = BaseMenuInput & {
  type: "variant";
  variants: Record<string, unknown>;
};

export async function createMenu(input: SimpleMenuInput | VariantMenuInput) {
  const { data } = await apiRequest<MenuListItem>("/api/menus", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

type UpdateMenuInput = Partial<
  SimpleMenuInput &
    VariantMenuInput & {
      type: "simple" | "variant";
    }
>;

export async function updateMenu(menuId: string, input: UpdateMenuInput) {
  const { data } = await apiRequest<MenuListItem>(`/api/menus/${menuId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data;
}

export async function deleteMenu(menuId: string) {
  const { data } = await apiRequest<{ success: boolean }>(
    `/api/menus/${menuId}`,
    {
      method: "DELETE",
    },
  );
  return data;
}

export async function publishMenu(menuId: string, isActive: boolean) {
  const { data } = await apiRequest<MenuListItem>(
    `/api/menus/${menuId}/publish`,
    {
      method: "POST",
      body: JSON.stringify({ isActive }),
    },
  );
  return data;
}
