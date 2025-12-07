import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import {
  exportPurchaseHistoryCsv,
  getStoreIngredient,
  listPurchaseHistory,
  listStoreIngredients,
  updateStoreIngredient,
  createStoreIngredient,
  type StoreIngredientListResult,
  type PurchaseHistoryMeta,
} from "./client";
import type {
  PurchaseHistoryFilters,
  StoreIngredientFilters,
  UpdateStoreIngredientInput,
  CreateStoreIngredientInput,
} from "./schemas";
import type { PurchaseHistoryEntry, StoreIngredientDetail } from "./types";
import { createBrowserClient } from "@/lib/supabase/client";

const STORE_INGREDIENTS_KEY = "storeIngredients";
const STORE_INGREDIENT_DETAIL_KEY = "storeIngredientDetail";
const PURCHASE_HISTORY_KEY = "storeIngredientPurchaseHistory";

type UseStoreIngredientsOptions = {
  initialData?: StoreIngredientListResult;
};

export function useStoreIngredients(
  filters: StoreIngredientFilters,
  options: UseStoreIngredientsOptions = {},
) {
  return useQuery({
    queryKey: [STORE_INGREDIENTS_KEY, filters],
    queryFn: () => listStoreIngredients(filters),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

export function useStoreIngredient(ingredientId: string) {
  return useQuery({
    queryKey: [STORE_INGREDIENT_DETAIL_KEY, ingredientId],
    queryFn: () => getStoreIngredient(ingredientId),
    enabled: Boolean(ingredientId),
    gcTime: 1000 * 60 * 5,
  });
}

type UseStoreIngredientDetailOptions = {
  initialData?: StoreIngredientDetail;
};

export function useStoreIngredientDetail(
  ingredientId: string,
  options: UseStoreIngredientDetailOptions = {},
) {
  return useQuery({
    queryKey: [STORE_INGREDIENT_DETAIL_KEY, ingredientId],
    queryFn: () => getStoreIngredient(ingredientId),
    enabled: Boolean(ingredientId),
    gcTime: 1000 * 60 * 5,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

type PurchaseHistoryOptions = {
  initialData?: {
    items: PurchaseHistoryEntry[];
    meta: PurchaseHistoryMeta | null;
  };
};

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
    gcTime: 1000 * 60 * 10,
    staleTime: 1000 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

export function useExportPurchaseHistoryMutation(ingredientId: string) {
  return useMutation({
    mutationFn: (filters: PurchaseHistoryFilters) =>
      exportPurchaseHistoryCsv(ingredientId, filters),
  });
}

export function useStoreIngredientsRealtime(enabled = true) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("store-ingredients")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_ingredients" },
        () => {
          queryClient.invalidateQueries({ queryKey: [STORE_INGREDIENTS_KEY] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE_INGREDIENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [STORE_INGREDIENT_DETAIL_KEY] });
    },
  });
}

export function useCreateStoreIngredientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStoreIngredientInput) => createStoreIngredient(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE_INGREDIENTS_KEY] });
    },
  });
}
