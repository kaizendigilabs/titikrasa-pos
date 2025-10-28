import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import {
  createRecipe,
  deleteRecipe,
  listRecipes,
  updateRecipe,
  type RecipeInput,
} from "./client";
import type { RecipeFilters } from "./types";
import { createBrowserClient } from "@/lib/supabase/client";

const RECIPES_QUERY_KEY = "recipes";

type RecipesQueryResult = Awaited<ReturnType<typeof listRecipes>>;

function normalizeFilters(filters: RecipeFilters): RecipeFilters {
  return {
    search: filters.search ?? null,
    menuId: filters.menuId ?? null,
  };
}

export function useRecipes(
  filters: RecipeFilters,
  options: { initialData?: RecipesQueryResult } = {},
) {
  const normalized = normalizeFilters(filters);
  return useQuery({
    queryKey: [RECIPES_QUERY_KEY, normalized],
    queryFn: () => listRecipes(normalized),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

export function useRecipesRealtime(
  filters: RecipeFilters,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const queryClient = useQueryClient();
  const normalized = normalizeFilters(filters);

  React.useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("recipes-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recipes" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: [RECIPES_QUERY_KEY, normalized],
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipe_variant_overrides",
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: [RECIPES_QUERY_KEY, normalized],
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, normalized, queryClient]);
}

export function useCreateRecipeMutation(filters: RecipeFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRecipe,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [RECIPES_QUERY_KEY, normalizeFilters(filters)],
      });
    },
  });
}

export function useUpdateRecipeMutation(filters: RecipeFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, input }: { recipeId: string; input: Partial<RecipeInput> }) =>
      updateRecipe(recipeId, input),
    onSuccess: (recipe) => {
      queryClient.setQueryData<RecipesQueryResult | undefined>(
        [RECIPES_QUERY_KEY, normalizeFilters(filters)],
        (current) => {
          if (!current) return current;
          return {
            ...current,
            recipes: current.recipes.map((item) => (item.id === recipe.id ? recipe : item)),
          };
        },
      );
    },
  });
}

export function useDeleteRecipeMutation(filters: RecipeFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => deleteRecipe(recipeId),
    onSuccess: (_result, recipeId) => {
      queryClient.setQueryData<RecipesQueryResult | undefined>(
        [RECIPES_QUERY_KEY, normalizeFilters(filters)],
        (current) => {
          if (!current) return current;
          return {
            ...current,
            recipes: current.recipes.filter((recipe) => recipe.id !== recipeId),
          };
        },
      );
    },
  });
}
