import { AppError, ERR } from "@/lib/utils/errors";

import type { MenuCategory, MenuCategoryFilters } from "./types";

type ApiResponse<TData> = {
  data: TData;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

type ListCategoriesResponse = {
  items: MenuCategory[];
};

export async function listMenuCategories(filters: MenuCategoryFilters = {}) {
  const searchParams = new URLSearchParams();
  if (filters.search) searchParams.set("search", filters.search);
  if (filters.status) searchParams.set("status", filters.status);
  if (filters.page) searchParams.set("page", String(filters.page));
  if (filters.pageSize) searchParams.set("pageSize", String(filters.pageSize));

  const query = searchParams.toString();
  const url = `/api/menu-categories${query ? `?${query}` : ""}`;

  const response = await request<ListCategoriesResponse>(url, {
    method: "GET",
  });

  return {
    items: response.data.items,
    meta: response.meta,
  };
}

export async function createMenuCategory(input: {
  name: string;
  slug: string;
  iconUrl?: string | null;
  sortOrder?: number | null;
  isActive?: boolean;
}) {
  const { data } = await request<MenuCategory>("/api/menu-categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updateMenuCategory(
  categoryId: string,
  input: Partial<{
    name: string;
    slug: string;
    iconUrl: string | null;
    sortOrder: number | null;
    isActive: boolean;
  }>,
) {
  const { data } = await request<MenuCategory>(
    `/api/menu-categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return data;
}

export async function deleteMenuCategory(categoryId: string) {
  const { data } = await request<{ success: boolean }>(
    `/api/menu-categories/${categoryId}`,
    {
      method: "DELETE",
    },
  );
  return data;
}

async function request<T>(input: string, init: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch (error) {
    throw new AppError(
      ERR.SERVER_ERROR.statusCode,
      error instanceof Error
        ? error.message
        : "Unexpected response from server",
    );
  }

  if (!response.ok || payload.error) {
    throw new AppError(
      payload.error?.code ?? response.status,
      payload.error?.message ?? "Request failed",
    );
  }

  return {
    data: payload.data,
    meta: payload.meta,
  };
}
