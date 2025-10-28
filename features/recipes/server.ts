import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";
import { appError, ERR } from "@/lib/utils/errors";

import { mapRecipeRow, type IngredientLookup, type RawRecipeRow, type RawVariantRow } from "./mappers";
import type { RecipeFilters, RecipeListItem } from "./types";
import {
  serializeMethodSteps,
  serializeRecipeItems,
  toRecipeInsertPayload,
  toVariantOverridePayload,
  type CreateRecipeInput,
} from "./utils";

type RecipeUpdatePayload = Database["public"]["Tables"]["recipes"]["Update"];

const RECIPE_SELECT_FIELDS = `
  id,
  menu_id,
  version,
  effective_from,
  items,
  method_steps,
  created_at,
  menus (
    id,
    name,
    thumbnail_url
  )
`;

type AnyClient = SupabaseClient<Database>;

function normalizeFilters(filters: RecipeFilters | undefined) {
  return {
    search: filters?.search?.trim() ?? null,
    menuId: filters?.menuId ?? null,
    limit: filters?.limit && Number.isFinite(filters.limit)
      ? Math.min(Math.max(filters.limit, 1), 500)
      : 200,
  };
}

function collectIngredientIds(recipes: RawRecipeRow[], overrides: RawVariantRow[]): Set<string> {
  const ids = new Set<string>();

  for (const recipe of recipes) {
    const items = recipe.items;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item && typeof item === "object") {
          const value = (item as Record<string, unknown>).ingredient_id;
          if (typeof value === "string") {
            ids.add(value);
          }
        }
      }
    }
  }

  for (const override of overrides) {
    const items = override.items;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item && typeof item === "object") {
          const value = (item as Record<string, unknown>).ingredient_id;
          if (typeof value === "string") {
            ids.add(value);
          }
        }
      }
    }
  }

  return ids;
}

async function resolveIngredientLookup(client: AnyClient, ids: Set<string>): Promise<IngredientLookup> {
  if (ids.size === 0) {
    return {};
  }

  const { data, error } = await client
    .from("store_ingredients")
    .select("id, name, base_uom")
    .in("id", Array.from(ids));

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load ingredient lookup",
      details: { hint: error.message },
    });
  }

  const lookup: IngredientLookup = {};
  for (const row of data ?? []) {
    lookup[row.id] = {
      name: row.name,
      uom: row.base_uom ?? "",
    };
  }
  return lookup;
}

export async function fetchRecipes(
  client: AnyClient,
  filters: RecipeFilters | undefined,
): Promise<RecipeListItem[]> {
  const { search, menuId, limit } = normalizeFilters(filters);

  let query = client
    .from("recipes")
    .select(RECIPE_SELECT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (menuId) {
    query = query.eq("menu_id", menuId);
  }

  const { data: recipeRows, error: recipeError } = await query.returns<RawRecipeRow[]>();

  if (recipeError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to fetch recipes",
      details: { hint: recipeError.message },
    });
  }

  let overrideRows: RawVariantRow[] = [];
  if (recipeRows && recipeRows.length > 0) {
    const menuIds = recipeRows.map((row) => row.menu_id);
    const { data, error } = await client
      .from("recipe_variant_overrides")
      .select("menu_id, version, size, temperature, items")
      .in("menu_id", menuIds)
      .returns<RawVariantRow[]>();

    if (error) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to load recipe variant overrides",
        details: { hint: error.message },
      });
    }

    overrideRows = data ?? [];
  }

  const ingredientIds = collectIngredientIds(recipeRows ?? [], overrideRows ?? []);

  const lookup = await resolveIngredientLookup(client, ingredientIds);

  let recipes = recipeRows ?? [];

  if (search) {
    const lower = search.toLowerCase();
    recipes = recipes.filter((row) =>
      row.menus?.name?.toLowerCase().includes(lower),
    );
  }

  return recipes.map((row) =>
    mapRecipeRow(row, lookup, overrideRows ?? []),
  );
}

async function fetchRecipeRowById(
  client: AnyClient,
  recipeId: string,
): Promise<RawRecipeRow | null> {
  const { data, error } = await client
    .from("recipes")
    .select(RECIPE_SELECT_FIELDS)
    .eq("id", recipeId)
    .maybeSingle();

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load recipe",
      details: { hint: error.message, recipeId },
    });
  }

  return (data as RawRecipeRow | null) ?? null;
}

async function fetchOverridesForRecipe(
  client: AnyClient,
  menuId: string,
  version: number,
): Promise<RawVariantRow[]> {
  const { data, error } = await client
    .from("recipe_variant_overrides")
    .select("menu_id, version, size, temperature, items")
    .eq("menu_id", menuId)
    .eq("version", version)
    .returns<RawVariantRow[]>();

  if (error) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to load recipe overrides",
      details: { hint: error.message, menuId, version },
    });
  }

  return data ?? [];
}

export async function fetchRecipeById(
  client: AnyClient,
  recipeId: string,
): Promise<RecipeListItem | null> {
  const recipe = await fetchRecipeRowById(client, recipeId);
  if (!recipe) return null;

  const overrides = await fetchOverridesForRecipe(client, recipe.menu_id, recipe.version);
  const lookup = await resolveIngredientLookup(client, collectIngredientIds([recipe], overrides));

  return mapRecipeRow(recipe, lookup, overrides);
}

function buildRecipeUpdatePayload(input: Partial<{
  items: CreateRecipeInput["items"];
  methodSteps: NonNullable<CreateRecipeInput["methodSteps"]>;
  effectiveFrom: string | null | undefined;
  version: number | undefined;
}>): RecipeUpdatePayload {
  const patch: RecipeUpdatePayload = {};
  if (input.items) {
    patch.items = serializeRecipeItems(input.items);
  }
  if (input.methodSteps) {
    patch.method_steps = serializeMethodSteps(input.methodSteps);
  }
  if (input.effectiveFrom !== undefined) {
    if (input.effectiveFrom === null) {
      patch.effective_from = undefined;
    } else {
      patch.effective_from = input.effectiveFrom;
    }
  }
  if (input.version !== undefined) {
    patch.version = input.version;
  }
  return patch;
}

export async function createRecipe(
  client: AnyClient,
  input: CreateRecipeInput,
) {
  const payload = toRecipeInsertPayload(input);
  const { data, error } = await client
    .from("recipes")
    .insert(payload)
    .select(RECIPE_SELECT_FIELDS)
    .single();

  if (error || !data) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to create recipe",
      details: { hint: error?.message },
    });
  }

  const overridesPayload =
    input.variantOverrides && input.variantOverrides.length > 0
      ? toVariantOverridePayload(data.menu_id, data.version, input.variantOverrides)
      : [];

  if (overridesPayload.length > 0) {
    const { error: overrideError } = await client
      .from("recipe_variant_overrides")
      .upsert(overridesPayload, { onConflict: "menu_id,size,temperature,version" });

    if (overrideError) {
      await client.from("recipes").delete().eq("id", data.id);
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to create recipe overrides",
        details: { hint: overrideError.message },
      });
    }
  }

  const overrides = await fetchOverridesForRecipe(client, data.menu_id, data.version);
  const lookup = await resolveIngredientLookup(client, collectIngredientIds([data as RawRecipeRow], overrides));
  return mapRecipeRow(data as RawRecipeRow, lookup, overrides);
}

export async function updateRecipe(
  client: AnyClient,
  recipeId: string,
  input: Partial<CreateRecipeInput>,
) {
  const existing = await fetchRecipeRowById(client, recipeId);
  if (!existing) {
    throw ERR.NOT_FOUND;
  }

  const patch = buildRecipeUpdatePayload({
    items: input.items,
    methodSteps: input.methodSteps,
    effectiveFrom: input.effectiveFrom,
    version: input.version,
  });

  if (input.menuId && input.menuId !== existing.menu_id) {
    patch.menu_id = input.menuId;
  }

  const { data, error } = await client
    .from("recipes")
    .update(patch)
    .eq("id", recipeId)
    .select(RECIPE_SELECT_FIELDS)
    .single();

  if (error || !data) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to update recipe",
      details: { hint: error?.message, recipeId },
    });
  }

  const finalMenuId = data.menu_id;
  const finalVersion = data.version;

  if (input.variantOverrides !== undefined) {
    const { error: deleteError } = await client
      .from("recipe_variant_overrides")
      .delete()
      .eq("menu_id", finalMenuId)
      .eq("version", finalVersion);

    if (deleteError) {
      throw appError(ERR.SERVER_ERROR, {
        message: "Failed to update recipe overrides",
        details: { hint: deleteError.message, recipeId },
      });
    }

    if (input.variantOverrides.length > 0) {
      const overridesPayload = toVariantOverridePayload(
        finalMenuId,
        finalVersion,
        input.variantOverrides,
      );
      const { error: insertError } = await client
        .from("recipe_variant_overrides")
        .upsert(overridesPayload, { onConflict: "menu_id,size,temperature,version" });

      if (insertError) {
        throw appError(ERR.SERVER_ERROR, {
          message: "Failed to save recipe overrides",
          details: { hint: insertError.message, recipeId },
        });
      }
    }
  }

  const overrides = await fetchOverridesForRecipe(client, finalMenuId, finalVersion);
  const lookup = await resolveIngredientLookup(client, collectIngredientIds([data as RawRecipeRow], overrides));
  return mapRecipeRow(data as RawRecipeRow, lookup, overrides);
}

export async function deleteRecipe(client: AnyClient, recipeId: string) {
  const existing = await fetchRecipeRowById(client, recipeId);
  if (!existing) {
    throw ERR.NOT_FOUND;
  }

  const { error: deleteOverridesError } = await client
    .from("recipe_variant_overrides")
    .delete()
    .eq("menu_id", existing.menu_id)
    .eq("version", existing.version);

  if (deleteOverridesError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to delete recipe overrides",
      details: { hint: deleteOverridesError.message, recipeId },
    });
  }

  const { error: deleteRecipeError } = await client
    .from("recipes")
    .delete()
    .eq("id", recipeId);

  if (deleteRecipeError) {
    throw appError(ERR.SERVER_ERROR, {
      message: "Failed to delete recipe",
      details: { hint: deleteRecipeError.message, recipeId },
    });
  }

  return { success: true as const };
}
