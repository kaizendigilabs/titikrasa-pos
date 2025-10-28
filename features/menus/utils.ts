import {
  type MenuVariantsConfig,
  type MenuSize,
  type MenuTemperature,
} from "./types";
import type { MenuVariantsInput } from "./schemas";

type PersistedMenuVariants = {
  allowed_sizes: MenuSize[];
  allowed_temperatures: MenuTemperature[];
  default_size: MenuSize | null;
  default_temperature: MenuTemperature | null;
  prices: Record<
    "retail" | "reseller",
    Partial<Record<MenuSize, Partial<Record<MenuTemperature, number | null>>>>
  >;
};

export function toPersistedVariants(
  input: MenuVariantsInput,
): PersistedMenuVariants {
  const allowedSizes = input.allowedSizes;
  const allowedTemperatures = input.allowedTemperatures;

  return {
    allowed_sizes: allowedSizes,
    allowed_temperatures: allowedTemperatures,
    default_size: input.defaultSize ?? (allowedSizes[0] ?? null),
    default_temperature:
      input.defaultTemperature ?? (allowedTemperatures[0] ?? null),
    prices: {
      retail: normalizePriceMap(
        input.prices.retail,
        allowedSizes,
        allowedTemperatures,
      ),
      reseller: normalizePriceMap(
        input.prices.reseller,
        allowedSizes,
        allowedTemperatures,
      ),
    },
  };
}

export function cloneVariantsConfig(
  variants: MenuVariantsConfig | null,
): MenuVariantsConfig | null {
  if (!variants) return null;
  return {
    allowed_sizes: [...variants.allowed_sizes],
    allowed_temperatures: [...variants.allowed_temperatures],
    default_size: variants.default_size,
    default_temperature: variants.default_temperature,
    prices: {
      retail: clonePriceMap(variants.prices.retail),
      reseller: clonePriceMap(variants.prices.reseller),
    },
    metadata: variants.metadata ? { ...variants.metadata } : undefined,
  };
}

function normalizePriceMap(
  prices: MenuVariantsInput["prices"]["retail"],
  sizes: MenuSize[],
  temps: MenuTemperature[],
) {
  const result: Partial<
    Record<MenuSize, Partial<Record<MenuTemperature, number | null>>>
  > = {};

  for (const size of sizes) {
    const sizePrices = prices[size];
    if (!sizePrices) continue;
    for (const temp of temps) {
      const raw = sizePrices[temp];
      if (raw === undefined) continue;
      if (!result[size]) {
        result[size] = {};
      }
      result[size]![temp] = raw ?? null;
    }
  }

  return result;
}

function clonePriceMap(
  map: Partial<Record<MenuSize, Partial<Record<MenuTemperature, number | null>>>>,
) {
  const result: Partial<
    Record<MenuSize, Partial<Record<MenuTemperature, number | null>>>
  > = {};
  for (const [size, tempMap] of Object.entries(map)) {
    const typedSize = size as MenuSize;
    result[typedSize] = {};
    if (!tempMap) continue;
    for (const [temp, value] of Object.entries(tempMap)) {
      const typedTemp = temp as MenuTemperature;
      result[typedSize]![typedTemp] = value ?? null;
    }
  }
  return result;
}
