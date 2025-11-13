import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";
import { appError, ERR } from "@/lib/utils/errors";

import { mapMenuRow, type RawMenuRow } from "./mappers";
import type { MenuListItem } from "./types";

type DbClient = SupabaseClient<Database>;

export async function getMenuById(
  supabase: DbClient,
  menuId: string,
): Promise<MenuListItem | null> {
  const { data, error } = await supabase
    .from("menus")
    .select(
      `
      id,
      name,
      sku,
      category_id,
      categories (
        id,
        name,
        icon_url
      ),
      price,
      reseller_price,
      is_active,
      thumbnail_url,
      variants,
      created_at
    `,
    )
    .eq("id", menuId)
    .maybeSingle();

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal memuat detail menu",
      details: { hint: error.message, menuId },
    });
  }

  if (!data) {
    return null;
  }

  return mapMenuRow(data as RawMenuRow);
}

export type MenusTableBootstrap = {
  initialMenus: MenuListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: "all" | "active" | "inactive";
      type: "all" | "simple" | "variant";
      categoryId: string | null;
      search: string | null;
    };
  };
  categories: Array<{ id: string; name: string }>;
};

export async function getMenusTableBootstrap(
  supabase: DbClient,
  options: { pageSize?: number } = {},
): Promise<MenusTableBootstrap> {
  const pageSize = options.pageSize ?? 50;
  const { data, error, count } = await supabase
    .from("menus")
    .select(
      `
      id,
      name,
      sku,
      category_id,
      categories (
        id,
        name,
        icon_url
      ),
      price,
      reseller_price,
      is_active,
      thumbnail_url,
      variants,
      created_at
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(0, pageSize - 1);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal memuat daftar menu",
      details: { hint: error.message },
    });
  }

  const initialMenus =
    (data as RawMenuRow[] | null)?.map(mapMenuRow) ?? [];

  const { data: categoryData, error: categoryError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (categoryError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal memuat kategori menu",
      details: { hint: categoryError.message },
    });
  }

  return {
    initialMenus,
    initialMeta: {
      pagination: {
        page: 1,
        pageSize,
        total: count ?? initialMenus.length,
      },
      filters: {
        status: "all",
        type: "all",
        categoryId: null,
        search: null,
      },
    },
    categories:
      categoryData?.map((category) => ({
        id: category.id,
        name: category.name,
      })) ?? [],
  };
}
