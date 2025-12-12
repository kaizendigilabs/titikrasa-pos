import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createStockAdjustment } from "./client";
import type { CreateStockAdjustmentPayload } from "./types";

const STORE_INGREDIENTS_QUERY_KEY = "storeIngredients";
const STORE_INGREDIENT_DETAIL_QUERY_KEY = "storeIngredientDetail";

export function useCreateStockAdjustmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStockAdjustmentPayload) =>
      createStockAdjustment(payload),
    onMutate: async (payload) => {
      if (!payload.commit) return; // Only optimistic update if committed

      await queryClient.cancelQueries({ queryKey: [STORE_INGREDIENTS_QUERY_KEY] });
      const previousIngredients = queryClient.getQueryData<any>([STORE_INGREDIENTS_QUERY_KEY]); // Using any implies type issues might need solving, but keeping simple for now

      queryClient.setQueryData([STORE_INGREDIENTS_QUERY_KEY], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: any) => {
             const adjustedItem = payload.items.find((i) => i.ingredientId === item.id);
             if (adjustedItem) {
               return { ...item, currentStock: adjustedItem.countedQty };
             }
             return item;
          })
        };
      });

      // Snapshot previous details
      const previousDetails = new Map();
      
      for (const item of payload.items) {
          await queryClient.cancelQueries({ queryKey: [STORE_INGREDIENT_DETAIL_QUERY_KEY, item.ingredientId] });
          const prev = queryClient.getQueryData([STORE_INGREDIENT_DETAIL_QUERY_KEY, item.ingredientId]);
          if (prev) {
              previousDetails.set(item.ingredientId, prev);
              queryClient.setQueryData([STORE_INGREDIENT_DETAIL_QUERY_KEY, item.ingredientId], (old: any) => ({
                  ...old,
                  currentStock: item.countedQty
              }));
          }
      }

      return { previousIngredients, previousDetails };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousIngredients) {
         queryClient.setQueryData([STORE_INGREDIENTS_QUERY_KEY], context.previousIngredients);
      }
      if (context?.previousDetails) {
          context.previousDetails.forEach((data: any, ingredientId: string) => {
              queryClient.setQueryData([STORE_INGREDIENT_DETAIL_QUERY_KEY, ingredientId], data);
          });
      }
    },
    onSettled: () => {
       // No invalidation needed
    },
  });
}

