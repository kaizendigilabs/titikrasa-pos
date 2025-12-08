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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE_INGREDIENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STORE_INGREDIENT_DETAIL_QUERY_KEY] });
    },
  });
}

