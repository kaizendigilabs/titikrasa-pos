import { AppError, ERR } from "@/lib/utils/errors";

import type { MenuFilters, MenuListItem } from "./types";

type ApiResponse<TData> = {
  data: TData;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

type ListMenusResponse = {
  items: MenuListItem[];
};

export async function listMenus(filters: MenuFilters = {}) {
  const searchParams = new URLSearchParams();
  if (filters.search) searchParams.set("search", filters.search);
  if (filters.status) searchParams.set("status", filters.status);
  if (filters.categoryId) searchParams.set("categoryId", filters.categoryId);
  if (filters.type) searchParams.set("type", filters.type);
  if (filters.page) searchParams.set("page", String(filters.page));
  if (filters.pageSize) searchParams.set("pageSize", String(filters.pageSize));

  const query = searchParams.toString();
  const url = `/api/menus${query ? `?${query}` : ""}`;

  const response = await request<ListMenusResponse>(url, {
    method: "GET",
  });

  return {
    items: response.data.items,
    meta: response.meta,
  };
}

export async function getMenu(menuId: string) {
  const { data } = await request<MenuListItem>(`/api/menus/${menuId}`, {
    method: "GET",
  });
  return data;
}

export async function createMenu(
  input:
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
      },
) {
  const { data } = await request<MenuListItem>("/api/menus", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updateMenu(
  menuId: string,
  input: Partial<{
    type: "simple" | "variant";
    name: string;
    sku: string | null;
    categoryId: string | null;
    thumbnailUrl: string | null;
    isActive: boolean;
    price: number;
    resellerPrice: number | null;
    variants: Record<string, unknown>;
  }>,
) {
  const { data } = await request<MenuListItem>(`/api/menus/${menuId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data;
}

export async function deleteMenu(menuId: string) {
  const { data } = await request<{ success: boolean }>(
    `/api/menus/${menuId}`,
    {
      method: "DELETE",
    },
  );
  return data;
}

export async function publishMenu(menuId: string, isActive: boolean) {
  const { data } = await request<MenuListItem>(
    `/api/menus/${menuId}/publish`,
    {
      method: "POST",
      body: JSON.stringify({ isActive }),
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
