import type { RecipeListItem, RecipeItem, RecipeMethodStep, RecipeVariantOverride } from "./types";

type RawRecipeRow = {
  id: string;
  menu_id: string;
  version: number;
  effective_from: string;
  items: unknown;
  method_steps: unknown;
  created_at: string;
  menus: {
    id: string;
    name: string;
    thumbnail_url: string | null;
  } | null;
};

type RawVariantRow = {
  menu_id: string;
  version: number;
  size: string;
  temperature: string;
  items: unknown;
};

type IngredientLookup = Record<
  string,
  {
    name: string;
    uom: string;
  }
>;

function coerceItems(
  payload: unknown,
  lookup: IngredientLookup,
): RecipeItem[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const result: RecipeItem[] = [];

  for (const raw of payload) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;
    const ingredientId = typeof entry.ingredient_id === "string" ? entry.ingredient_id : null;
    if (!ingredientId) continue;
    const quantity = Number(entry.qty ?? entry.quantity ?? 0);
    const uom =
      typeof entry.uom === "string"
        ? entry.uom
        : lookup[ingredientId]?.uom ?? "";

    result.push({
      ingredientId,
      ingredientName: lookup[ingredientId]?.name ?? null,
      quantity,
      uom,
    });
  }

  return result;
}

function coerceSteps(payload: unknown): RecipeMethodStep[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const entry = raw as Record<string, unknown>;
      const stepNo = Number(entry.step_no ?? entry.stepNo ?? 0);
      const instruction =
        typeof entry.instruction === "string" ? entry.instruction : "";
      if (!instruction) return null;
      return { step_no: stepNo, instruction } satisfies RecipeMethodStep;
    })
    .filter((item): item is RecipeMethodStep => item !== null)
    .sort((a, b) => a.step_no - b.step_no);
}

export function mapRecipeRow(
  row: RawRecipeRow,
  ingredientLookup: IngredientLookup,
  overrides: RawVariantRow[],
): RecipeListItem {
  const variantOverrides: RecipeVariantOverride[] = overrides
    .filter((item) => item.menu_id === row.menu_id && item.version === row.version)
    .map((override) => ({
      size: String(override.size),
      temperature: String(override.temperature),
      items: coerceItems(override.items, ingredientLookup),
    }));

  return {
    id: row.id,
    menuId: row.menu_id,
    menuName: row.menus?.name ?? "Unknown Menu",
    menuThumbnail: row.menus?.thumbnail_url ?? null,
    version: row.version,
    effectiveFrom: row.effective_from,
    items: coerceItems(row.items, ingredientLookup),
    methodSteps: coerceSteps(row.method_steps),
    overrides: variantOverrides,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

export type { RawRecipeRow, RawVariantRow, IngredientLookup };
