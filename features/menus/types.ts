export const MENU_SIZES = ["s", "m", "l"] as const;
export const MENU_TEMPERATURES = ["hot", "ice"] as const;

export type MenuSize = (typeof MENU_SIZES)[number];
export type MenuTemperature = (typeof MENU_TEMPERATURES)[number];

export type MenuVariantPrices = Partial<
  Record<MenuSize, Partial<Record<MenuTemperature, number | null>>>
>;

export type MenuChannelPrices = {
  retail: MenuVariantPrices;
  reseller: MenuVariantPrices;
};

export type MenuVariantsConfig = {
  allowed_sizes: MenuSize[];
  allowed_temperatures: MenuTemperature[];
  default_size: MenuSize | null;
  default_temperature: MenuTemperature | null;
  prices: MenuChannelPrices;
  metadata?: Record<string, unknown>;
};

export type MenuListItem = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  category_name: string | null;
  category_icon_url: string | null;
  is_active: boolean;
  thumbnail_url: string | null;
  price: number | null;
  reseller_price: number | null;
  variants: MenuVariantsConfig | null;
  type: "simple" | "variant";
  created_at: string;
  default_retail_price: number | null;
  default_reseller_price: number | null;
};

export type MenuFilters = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  status?: "all" | "active" | "inactive";
  categoryId?: string | null;
  type?: "all" | "simple" | "variant";
};

export type MenuDetail = MenuListItem & {
  description?: string | null;
};

export type MenuListResponse = {
  items: MenuListItem[];
};
