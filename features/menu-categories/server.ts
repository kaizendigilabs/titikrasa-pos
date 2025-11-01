import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";
import { appError, ERR } from "@/lib/utils/errors";

import { mapCategoryRow } from "./data/dto";
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
