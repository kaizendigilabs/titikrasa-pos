export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  icon_url: string | null;
  created_at: string;
};

export type MenuCategoryListResponse = {
  items: MenuCategory[];
};

export type MenuCategoryFilters = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  status?: "all" | "active" | "inactive";
};
