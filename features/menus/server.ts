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
