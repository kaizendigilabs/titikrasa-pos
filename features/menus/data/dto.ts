import {
  MENU_SIZES,
  MENU_TEMPERATURES,
  type MenuChannelPrices,
  type MenuListItem,
  type MenuSize,
  type MenuTemperature,
  type MenuVariantsConfig,
} from "../types";

export type RawMenuRow = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  categories?: {
    id: string;
    name: string;
    icon_url: string | null;
  } | null;
  price: number | null;
  reseller_price: number | null;
  is_active: boolean;
  thumbnail_url: string | null;
  variants: unknown;
  created_at: string;
};

const VALID_SIZES = new Set<MenuSize>(MENU_SIZES);
const VALID_TEMPS = new Set<MenuTemperature>(MENU_TEMPERATURES);

export function mapMenuRow(row: RawMenuRow): MenuListItem {
  const variants = parseVariants(row.variants);
  const defaultRetail =
    variants?.default_size && variants?.default_temperature
      ? resolveVariantPrice(
          variants,
          "retail",
          variants.default_size,
          variants.default_temperature,
        )
      : row.price ?? null;
  const defaultReseller =
    variants?.default_size && variants?.default_temperature
      ? resolveVariantPrice(
          variants,
          "reseller",
          variants.default_size,
          variants.default_temperature,
        )
      : row.reseller_price ?? null;

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category_id: row.category_id,
    category_name: row.categories?.name ?? null,
    category_icon_url: row.categories?.icon_url ?? null,
    is_active: row.is_active,
    thumbnail_url: row.thumbnail_url ?? null,
    price: row.price ?? null,
    reseller_price: row.reseller_price ?? null,
    variants,
    type: variants ? "variant" : "simple",
    created_at: row.created_at,
    default_retail_price: defaultRetail ?? null,
    default_reseller_price: defaultReseller ?? null,
  };
}

function parseVariants(value: unknown): MenuVariantsConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const sizes = Array.isArray(record.allowed_sizes)
    ? (record.allowed_sizes.filter((size) =>
        typeof size === "string" && VALID_SIZES.has(size as MenuSize),
      ) as MenuSize[])
    : [];
  const temperatures = Array.isArray(record.allowed_temperatures)
    ? (record.allowed_temperatures.filter((temp) =>
        typeof temp === "string" &&
        VALID_TEMPS.has(temp as MenuTemperature),
      ) as MenuTemperature[])
    : [];

  if (sizes.length === 0 || temperatures.length === 0) {
    return null;
  }

  const defaultSize =
    typeof record.default_size === "string" &&
    VALID_SIZES.has(record.default_size as MenuSize)
      ? (record.default_size as MenuSize)
      : sizes[0] ?? null;
  const defaultTemperature =
    typeof record.default_temperature === "string" &&
    VALID_TEMPS.has(record.default_temperature as MenuTemperature)
      ? (record.default_temperature as MenuTemperature)
      : temperatures[0] ?? null;

  const prices = normalizePrices(record.prices, sizes, temperatures);

  return {
    allowed_sizes: sizes,
    allowed_temperatures: temperatures,
    default_size: defaultSize,
    default_temperature: defaultTemperature,
    prices,
    metadata:
      typeof record.metadata === "object" && record.metadata !== null
        ? (record.metadata as Record<string, unknown>)
        : undefined,
  };
}

function normalizePrices(
  value: unknown,
  sizes: MenuSize[],
  temps: MenuTemperature[],
): MenuChannelPrices {
  const defaultPrices: MenuChannelPrices = {
    retail: {},
    reseller: {},
  };

  if (!value || typeof value !== "object") {
    return defaultPrices;
  }

  const record = value as Record<
    string,
    Record<string, unknown> | undefined
  >;

  for (const channel of ["retail", "reseller"] as const) {
    const channelValue = record[channel];
    if (!channelValue || typeof channelValue !== "object") continue;
    const channelPrices = channelValue as Record<
      string,
      Record<string, unknown> | undefined
    >;
    for (const size of sizes) {
      const sizePrices = channelPrices[size];
      if (!sizePrices || typeof sizePrices !== "object") continue;
      for (const temp of temps) {
        const raw = sizePrices[temp];
        if (typeof raw === "number") {
          const channelStore = (defaultPrices[channel] ??= {});
          const sizeStore = (channelStore[size] ??= {});
          sizeStore[temp] = raw;
        } else if (raw === null) {
          const channelStore = (defaultPrices[channel] ??= {});
          const sizeStore = (channelStore[size] ??= {});
          sizeStore[temp] = null;
        }
      }
    }
  }

  return defaultPrices;
}

function resolveVariantPrice(
  variants: MenuVariantsConfig,
  channel: keyof MenuChannelPrices,
  size: MenuSize,
  temperature: MenuTemperature,
) {
  return (
    variants.prices[channel]?.[size]?.[temperature] ??
    null
  );
}
