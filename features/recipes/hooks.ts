import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";

import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  updateRecipe,
  type RecipeInput,
} from "./client";
import type { RecipeFilters } from "./types";

const RECIPES_QUERY_KEY = "recipes";

type RecipesQueryResult = Awaited<ReturnType<typeof listRecipes>>;

/**
 * Normalizes filter values for consistent query keys
 */
function normalizeFilters(filters: RecipeFilters): RecipeFilters {
  return {
    search: filters.search ?? null,
    menuId: filters.menuId ?? null,
  };
}

/**
 * Hook for fetching recipes list
 */
export function useRecipes(
  filters: RecipeFilters,
  options: { initialData?: RecipesQueryResult } = {},
) {
  const normalized = normalizeFilters(filters);
  
  return useQuery({
    queryKey: [RECIPES_QUERY_KEY, normalized],
    queryFn: () => listRecipes(normalized),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.STATIC,
    retry: 1,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

/**
 * Hook for real-time recipe updates via Supabase
 */
/**
 * Hook for creating a recipe
 */
export function useCreateRecipeMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRecipe,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [RECIPES_QUERY_KEY],
      });
      void queryClient.refetchQueries({
        queryKey: [RECIPES_QUERY_KEY],
        type: "active",
      });
    },
  });
}

/**
 * Hook for updating a recipe
 */
export function useUpdateRecipeMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ recipeId, input }: { recipeId: string; input: Partial<RecipeInput> }) =>
      updateRecipe(recipeId, input),
    onMutate: async ({ recipeId, input }) => {
       await queryClient.cancelQueries({ queryKey: [RECIPES_QUERY_KEY] });
       
       // Snapshot is tricky for multiple lists. We'll snapshot all queries matching the key? 
       // For simplicity, we won't snapshot everything perfectly for rollback unless we iterate.
       // But assuming generic error handling, we invalidate on error.
       
       // Optimistic update for lists
       queryClient.setQueriesData({ queryKey: [RECIPES_QUERY_KEY] }, (old: any) => {
           if (!old || !old.recipes) return old;
           return {
               ...old,
               recipes: old.recipes.map((recipe: any) => 
                  recipe.id === recipeId ? { ...recipe, ...input, updatedAt: new Date().toISOString() } : recipe
               )
           };
       });

       // Optimistic update for detail
       const detailKey = [RECIPES_QUERY_KEY, "detail", recipeId];
       await queryClient.cancelQueries({ queryKey: detailKey });
       const previousDetail = queryClient.getQueryData(detailKey);
       
       if (previousDetail) {
           queryClient.setQueryData(detailKey, (old: any) => ({
               ...old,
               ...input,
               updatedAt: new Date().toISOString()
           }));
       }

       return { previousDetail };
    },
    onError: (_err, _vars, context) => {
        // Invalidate on error to restore sync
       void queryClient.invalidateQueries({ queryKey: [RECIPES_QUERY_KEY] });
       if (context?.previousDetail) {
           void queryClient.setQueryData([RECIPES_QUERY_KEY, "detail", _vars.recipeId], context.previousDetail);
       }
    },
    onSettled: () => {
       // We might want to invalidate eventually to ensure data consistency, or rely on optimistic
       // For this task, we want to remove realtime, but invalidation on settled is safe.
       // However, to be "instant" and "offline-like", we skip invalidation if successful.
       // But since we didn't snapshot lists perfectly, maybe safer to not invalidate?
       // Let's trust optimistic update.
    },
  });
}

/**
 * Hook for deleting a recipe
 */
export function useDeleteRecipeMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (recipeId: string) => deleteRecipe(recipeId),
    onMutate: async (recipeId) => {
        await queryClient.cancelQueries({ queryKey: [RECIPES_QUERY_KEY] });
        
        queryClient.setQueriesData({ queryKey: [RECIPES_QUERY_KEY] }, (old: any) => {
           if (!old || !old.recipes) return old;
           return {
               ...old,
               recipes: old.recipes.filter((recipe: any) => recipe.id !== recipeId)
           };
        });
    },
    onSuccess: () => {
       // No invalidation needed for lists as item is removed
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [RECIPES_QUERY_KEY] });
    }
  });
}

/**
 * Hook for fetching single recipe detail
 */
export function useRecipeDetail(
  recipeId: string | null,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  
  return useQuery({
    queryKey: [RECIPES_QUERY_KEY, "detail", recipeId],
    queryFn: () => {
      if (!recipeId) throw new Error("Recipe id missing");
      return getRecipe(recipeId);
    },
    enabled: enabled && Boolean(recipeId),
    ...CACHE_POLICIES.STATIC,
  });
}
