import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";


import {
  listPurchaseHistory,
  listStoreIngredients,
  updateStoreIngredient,
  createStoreIngredient,
  deleteStoreIngredient,
  type StoreIngredientListResult,
  type PurchaseHistoryMeta,
} from "./client";
import type {
  PurchaseHistoryFilters,
  StoreIngredientFilters,
  UpdateStoreIngredientInput,
  CreateStoreIngredientInput,
} from "./schemas";
import type { PurchaseHistoryEntry } from "./types";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";


const STORE_INGREDIENTS_KEY = "storeIngredients";
const STORE_INGREDIENT_DETAIL_KEY = "storeIngredientDetail";
const PURCHASE_HISTORY_KEY = "storeIngredientPurchaseHistory";

type UseStoreIngredientsOptions = {
  initialData?: StoreIngredientListResult;
};

/**
 * Hook for fetching store ingredients list
 */
export function useStoreIngredients(
  filters: StoreIngredientFilters,
  options: UseStoreIngredientsOptions = {},
) {
  return useQuery({
    queryKey: [STORE_INGREDIENTS_KEY, filters],
    queryFn: () => listStoreIngredients(filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.FREQUENT,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

type PurchaseHistoryOptions = {
  initialData?: {
    items: PurchaseHistoryEntry[];
    meta: PurchaseHistoryMeta | null;
  };
};

/**
 * Hook for fetching purchase history
 */
export function usePurchaseHistory(
  ingredientId: string,
  filters: PurchaseHistoryFilters,
  options: PurchaseHistoryOptions = {},
) {
  return useQuery({
    queryKey: [PURCHASE_HISTORY_KEY, ingredientId, filters],
    queryFn: () => listPurchaseHistory(ingredientId, filters),
    placeholderData: keepPreviousData,
    enabled: Boolean(ingredientId),
    ...CACHE_POLICIES.STATIC,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

/**
 * Hook for real-time store ingredient updates via Supabase
 */


/**
 * Hook for updating a store ingredient
 */
/**
 * Hook for updating a store ingredient
 */
export function useUpdateStoreIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ingredientId,
      payload,
    }: {
      ingredientId: string;
      payload: UpdateStoreIngredientInput;
    }) => updateStoreIngredient(ingredientId, payload),
    onMutate: async ({ ingredientId, payload }) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: [STORE_INGREDIENTS_KEY] });
      await queryClient.cancelQueries({ queryKey: [STORE_INGREDIENT_DETAIL_KEY, ingredientId] });

      // Snapshot previous value
      const previousIngredients = queryClient.getQueryData<StoreIngredientListResult>([STORE_INGREDIENTS_KEY]);
      const previousDetail = queryClient.getQueryData([STORE_INGREDIENT_DETAIL_KEY, ingredientId]);

      // Optimistic Update List
      queryClient.setQueryData([STORE_INGREDIENTS_KEY], (old: StoreIngredientListResult | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === ingredientId ? { ...item, ...payload } : item
          ),
        };
      });

      // Optimistic Update Detail (if it exists in cache)
      if (previousDetail) {
          queryClient.setQueryData([STORE_INGREDIENT_DETAIL_KEY, ingredientId], (old: any) => ({
              ...old,
              ...payload
          }));
      }

      return { previousIngredients, previousDetail };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousIngredients) {
        queryClient.setQueryData([STORE_INGREDIENTS_KEY], context.previousIngredients);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData([STORE_INGREDIENT_DETAIL_KEY, _vars.ingredientId], context.previousDetail);
      }
    },
    onSettled: () => {
      // No invalidation needed
    },
  });
}

/**
 * Hook for creating a store ingredient
 */
export function useCreateStoreIngredientMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateStoreIngredientInput) => createStoreIngredient(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: [STORE_INGREDIENTS_KEY] });
      const previousIngredients = queryClient.getQueryData<StoreIngredientListResult>([STORE_INGREDIENTS_KEY]);

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticItem = {
          id: optimisticId,
          ...payload,
          ...payload,
          currentStock: payload.minStock ?? 0, // Initial stock usually 0 or minStock based on logic, but creation doesn't set stock usually
          baseUom: payload.baseUom,
          avgCost: 0,
          lastPurchasePrice: null,
          lastPurchaseAt: null,
          lastSupplierName: null,
          lastSupplierId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };

      queryClient.setQueryData([STORE_INGREDIENTS_KEY], (old: StoreIngredientListResult | undefined) => {
          if (!old) return { items: [optimisticItem], meta: null };
          return {
              ...old,
              items: [optimisticItem, ...old.items]
          }
      });

      return { previousIngredients };
    },
    onError: (_err, _vars, context) => {
       if (context?.previousIngredients) {
        queryClient.setQueryData([STORE_INGREDIENTS_KEY], context.previousIngredients);
      }
    },
     onSettled: () => {
      // No invalidation needed
    },
  });
}

/**
 * Hook for deleting a store ingredient (hard delete)
 */
export function useDeleteStoreIngredientMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ingredientId: string) => deleteStoreIngredient(ingredientId),
    onMutate: async (ingredientId) => {
       await queryClient.cancelQueries({ queryKey: [STORE_INGREDIENTS_KEY] });
       const previousIngredients = queryClient.getQueryData<StoreIngredientListResult>([STORE_INGREDIENTS_KEY]);

       queryClient.setQueryData([STORE_INGREDIENTS_KEY], (old: StoreIngredientListResult | undefined) => {
           if (!old) return old;
           return {
               ...old,
               items: old.items.filter(item => item.id !== ingredientId)
           }
       });

       return { previousIngredients };
    },
    onError: (_err, _vars, context) => {
        if (context?.previousIngredients) {
        queryClient.setQueryData([STORE_INGREDIENTS_KEY], context.previousIngredients);
      }
    },
     onSettled: () => {
      // No invalidation needed
    },
  });
}
