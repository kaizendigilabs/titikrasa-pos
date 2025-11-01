import {
  MENU_SIZES,
  MENU_TEMPERATURES,
  type MenuListItem,
  type MenuSize,
  type MenuTemperature,
  type MenuVariantsConfig,
} from "../../types";
import { createMenuSchema, type MenuVariantsInput } from "./schema";
import { ZodError } from "zod";

export type MenuFormVariantState = {
  allowedSizes: Record<MenuSize, boolean>;
  allowedTemperatures: Record<MenuTemperature, boolean>;
  defaultSize: MenuSize | null;
  defaultTemperature: MenuTemperature | null;
  retailPrices: PriceMatrix;
  resellerPrices: PriceMatrix;
};

export type PriceMatrix = Record<MenuSize, Record<MenuTemperature, string>>;

export type MenuFormState = {
  type: "simple" | "variant";
  name: string;
  sku: string;
  categoryId: string | null;
  thumbnailUrl: string;
  isActive: boolean;
  price: string;
  resellerPrice: string;
  variants: MenuFormVariantState;
};

export type MenuFormSubmitPayload =
  | {
      type: "simple";
      name: string;
      sku?: string | null;
      categoryId?: string | null;
      thumbnailUrl?: string | null;
      isActive: boolean;
      price: number;
      resellerPrice?: number | null;
    }
  | {
      type: "variant";
      name: string;
      sku?: string | null;
      categoryId?: string | null;
      thumbnailUrl?: string | null;
      isActive: boolean;
      variants: MenuVariantsInput;
    };

export type MenuFormBuildResult =
  | { success: true; payload: MenuFormSubmitPayload }
  | { success: false; errors: Record<string, string> };

export function createEmptyPriceMatrix(): PriceMatrix {
  const matrix: PriceMatrix = {
    s: { hot: "", ice: "" },
    m: { hot: "", ice: "" },
    l: { hot: "", ice: "" },
  };
  return matrix;
}

export function createVariantStateFromConfig(
  config: MenuVariantsConfig | null,
): MenuFormVariantState {
  const state: MenuFormVariantState = {
    allowedSizes: { s: false, m: false, l: false },
    allowedTemperatures: { hot: false, ice: false },
    defaultSize: config?.default_size ?? null,
    defaultTemperature: config?.default_temperature ?? null,
    retailPrices: createEmptyPriceMatrix(),
    resellerPrices: createEmptyPriceMatrix(),
  };

  if (!config) {
    state.allowedSizes.s = true;
    state.allowedTemperatures.hot = true;
    return clampVariantDefaults(state);
  }

  for (const size of config.allowed_sizes) {
    state.allowedSizes[size] = true;
  }

  for (const temperature of config.allowed_temperatures) {
    state.allowedTemperatures[temperature] = true;
  }

  for (const [sizeKey, temps] of Object.entries(config.prices.retail)) {
    const size = sizeKey as MenuSize;
    if (!state.retailPrices[size]) continue;
    for (const [tempKey, value] of Object.entries(temps ?? {})) {
      const temperature = tempKey as MenuTemperature;
      state.retailPrices[size][temperature] =
        value != null ? String(value) : "";
    }
  }

  for (const [sizeKey, temps] of Object.entries(config.prices.reseller)) {
    const size = sizeKey as MenuSize;
    if (!state.resellerPrices[size]) continue;
    for (const [tempKey, value] of Object.entries(temps ?? {})) {
      const temperature = tempKey as MenuTemperature;
      state.resellerPrices[size][temperature] =
        value != null ? String(value) : "";
    }
  }

  return clampVariantDefaults(state);
}

export function clampVariantDefaults(
  variants: MenuFormVariantState,
): MenuFormVariantState {
  const allowedSizes = getAllowedSizes(variants);
  const allowedTemps = getAllowedTemperatures(variants);

  const defaultSize =
    variants.defaultSize && allowedSizes.includes(variants.defaultSize)
      ? variants.defaultSize
      : allowedSizes[0] ?? null;
  const defaultTemperature =
    variants.defaultTemperature &&
    allowedTemps.includes(variants.defaultTemperature)
      ? variants.defaultTemperature
      : allowedTemps[0] ?? null;

  return {
    ...variants,
    defaultSize,
    defaultTemperature,
  };
}

export function getAllowedSizes(variants: MenuFormVariantState): MenuSize[] {
  return MENU_SIZES.filter((size) => variants.allowedSizes[size]);
}

export function getAllowedTemperatures(
  variants: MenuFormVariantState,
): MenuTemperature[] {
  return MENU_TEMPERATURES.filter(
    (temperature) => variants.allowedTemperatures[temperature],
  );
}

export function createDefaultMenuFormState(): MenuFormState {
  return {
    type: "simple",
    name: "",
    sku: "",
    categoryId: null,
    thumbnailUrl: "",
    isActive: true,
    price: "",
    resellerPrice: "",
    variants: createVariantStateFromConfig(null),
  };
}

export function mapMenuToFormState(menu: MenuListItem): MenuFormState {
  const base = {
    name: menu.name,
    sku: menu.sku ?? "",
    categoryId: menu.category_id,
    thumbnailUrl: menu.thumbnail_url ?? "",
    isActive: menu.is_active,
  };

  if (menu.type === "simple") {
    return {
      type: "simple",
      ...base,
      price: menu.price != null ? String(menu.price) : "",
      resellerPrice:
        menu.reseller_price != null ? String(menu.reseller_price) : "",
      variants: createVariantStateFromConfig(null),
    };
  }

  return {
    type: "variant",
    ...base,
    price: "",
    resellerPrice: "",
    variants: createVariantStateFromConfig(menu.variants),
  };
}

function mapZodErrors(error: ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const key = issue.path.length ? issue.path.join(".") : "form";
    if (!acc[key]) {
      acc[key] = issue.message;
    }
    return acc;
  }, {});
}

function buildSimpleMenuInput(state: MenuFormState) {
  const resellerValue = state.resellerPrice.trim();
  return {
    type: "simple" as const,
    name: state.name.trim(),
    sku: state.sku.trim() || undefined,
    categoryId: state.categoryId ?? undefined,
    thumbnailUrl: state.thumbnailUrl.trim() || undefined,
    isActive: state.isActive,
    price: state.price.trim() || undefined,
    resellerPrice: resellerValue ? resellerValue : undefined,
  };
}

function buildVariantMenuInput(state: MenuFormState) {
  const allowedSizes = getAllowedSizes(state.variants);
  const allowedTemperatures = getAllowedTemperatures(state.variants);

  const prices = {
    retail: {} as Record<MenuSize, Record<MenuTemperature, string>>, 
    reseller: {} as Record<MenuSize, Record<MenuTemperature, string>>, 
  };

  for (const size of allowedSizes) {
    const retailRow: Record<MenuTemperature, string> = {};
    const resellerRow: Record<MenuTemperature, string> = {};
    for (const temperature of allowedTemperatures) {
      const retailValue = state.variants.retailPrices[size][temperature].trim();
      if (retailValue) {
        retailRow[temperature] = retailValue;
      }
      const resellerValue = state.variants.resellerPrices[size][temperature].trim();
      if (resellerValue) {
        resellerRow[temperature] = resellerValue;
      }
    }
    if (Object.keys(retailRow).length) {
      prices.retail[size] = retailRow;
    }
    if (Object.keys(resellerRow).length) {
      prices.reseller[size] = resellerRow;
    }
  }

  return {
    type: "variant" as const,
    name: state.name.trim(),
    sku: state.sku.trim() || undefined,
    categoryId: state.categoryId ?? undefined,
    thumbnailUrl: state.thumbnailUrl.trim() || undefined,
    isActive: state.isActive,
    variants: {
      allowedSizes,
      allowedTemperatures,
      defaultSize: state.variants.defaultSize ?? undefined,
      defaultTemperature: state.variants.defaultTemperature ?? undefined,
      prices,
    },
  };
}

export function buildMenuPayload(state: MenuFormState): MenuFormBuildResult {
  if (state.type === "simple") {
    const result = createMenuSchema.safeParse(buildSimpleMenuInput(state));
    if (!result.success) {
      return { success: false, errors: mapZodErrors(result.error) };
    }
    return { success: true, payload: result.data };
  }

  const result = createMenuSchema.safeParse(buildVariantMenuInput(state));
  if (!result.success) {
    return { success: false, errors: mapZodErrors(result.error) };
  }
  return { success: true, payload: result.data };
}
