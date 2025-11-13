import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";
import { appError, ERR } from "@/lib/utils/errors";

import { mapCategoryRow } from "./mappers";
import type { MenuCategory } from "./types";

type DbClient = SupabaseClient<Database>;

export async function getMenuCategoryById(
  supabase: DbClient,
  categoryId: string,
): Promise<MenuCategory | null> {
  const { data, error } = await supabase
    .from("categories")
    .select(
      `
      id,
      name,
      slug,
      sort_order,
      is_active,
      icon_url,
      created_at
    `,
    )
    .eq("id", categoryId)
    .maybeSingle();

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal mengambil kategori menu",
      details: { hint: error.message, categoryId },
    });
  }

  if (!data) return null;
  return mapCategoryRow(data);
}

export async function ensureCategoryIsUnused(
  supabase: DbClient,
  categoryId: string,
) {
  const { count, error } = await supabase
    .from("menus")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal memeriksa relasi kategori",
      details: { hint: error.message, categoryId },
    });
  }

  if (typeof count === "number" && count > 0) {
    throw appError(ERR.BAD_REQUEST, {
      message:
        "Kategori tidak dapat dihapus karena masih dipakai oleh menu aktif",
      details: { count },
    });
  }
}

export async function getNextCategorySortOrder(
  supabase: DbClient,
): Promise<number> {
  const { data, error } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal membaca urutan kategori",
      details: { hint: error.message },
    });
  }

  const currentTop = data?.[0]?.sort_order ?? 0;
  return (currentTop ?? 0) + 1;
}

export type MenuCategoriesTableBootstrap = {
  initialCategories: MenuCategory[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: "all" | "active" | "inactive";
      search: string | null;
    };
  };
};

export async function getMenuCategoriesBootstrap(
  supabase: DbClient,
  options: { pageSize?: number } = {},
): Promise<MenuCategoriesTableBootstrap> {
  const pageSize = options.pageSize ?? 50;
  const { data, error, count } = await supabase
    .from("categories")
    .select(
      `
      id,
      name,
      slug,
      sort_order,
      is_active,
      icon_url,
      created_at
    `,
      { count: "exact" },
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(0, pageSize - 1);

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Gagal memuat kategori menu",
      details: { hint: error.message },
    });
  }

  const initialCategories = (data ?? []).map(mapCategoryRow);

  return {
    initialCategories,
    initialMeta: {
      pagination: {
        page: 1,
        pageSize,
        total: count ?? initialCategories.length,
      },
      filters: {
        status: "all",
        search: null,
      },
    },
  };
}
