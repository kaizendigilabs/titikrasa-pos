import type { MenuCategory } from "../types";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean;
  icon_url: string | null;
  created_at: string;
};

export function mapCategoryRow(row: CategoryRow): MenuCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active,
    icon_url: row.icon_url ?? null,
    created_at: row.created_at,
  };
}
