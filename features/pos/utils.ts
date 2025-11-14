import type {
  MenuListItem,
  MenuSize,
  MenuTemperature,
  MenuVariantsConfig,
} from "@/features/menus/types";

export type VariantOption = {
  key: string;
  size: MenuSize;
  temperature: MenuTemperature;
  price: number;
  label: string;
};

export function resolveMenuPrice(
  menu: MenuListItem,
  channel: "pos" | "reseller",
  size: MenuSize | null,
  temperature: MenuTemperature | null,
) {
  if (!menu.variants) {
    return channel === "reseller"
      ? menu.reseller_price ?? null
      : menu.price ?? null;
  }

  const priceMap =
    menu.variants.prices[channel === "reseller" ? "reseller" : "retail"];

  if (!size || !temperature) {
    const defaultSize = menu.variants.default_size;
    const defaultTemp = menu.variants.default_temperature;
    if (!defaultSize || !defaultTemp) return null;
    return priceMap?.[defaultSize]?.[defaultTemp] ?? null;
  }

  return priceMap?.[size]?.[temperature] ?? null;
}

export function listVariantOptions(
  variants: MenuVariantsConfig,
  menu: MenuListItem,
  channel: "pos" | "reseller",
): VariantOption[] {
  const options: VariantOption[] = [];
  for (const size of variants.allowed_sizes) {
    for (const temp of variants.allowed_temperatures) {
      const key = `${size}|${temp}`;
      const price = resolveMenuPrice(menu, channel, size, temp);
      if (price == null) continue;
      const label = `${size.toUpperCase()} · ${temp.toUpperCase()}`;
      options.push({ key, size, temperature: temp, price, label });
    }
  }
  return options.filter((option) => option.price > 0);
}

export function hasResellerPrice(menu: MenuListItem) {
  if (!menu.variants) {
    return typeof menu.reseller_price === "number" && menu.reseller_price > 0;
  }
  for (const size of menu.variants.allowed_sizes) {
    for (const temp of menu.variants.allowed_temperatures) {
      const price = menu.variants.prices.reseller?.[size]?.[temp];
      if (price != null && price > 0) return true;
    }
  }
  return false;
}
