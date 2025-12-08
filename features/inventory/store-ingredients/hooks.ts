import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import { CACHE_POLICIES } from "@/lib/api/cache-policies";
import { createBrowserClient } from "@/lib/supabase/client";

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

/**
 * Hook for fetching single store ingredient
 */
export function useStoreIngredient(ingredientId: string) {
  return useQuery({
    queryKey: [STORE_INGREDIENT_DETAIL_KEY, ingredientId],
    queryFn: () => getStoreIngredient(ingredientId),
    enabled: Boolean(ingredientId),
    ...CACHE_POLICIES.FREQUENT,
  });
}

type UseStoreIngredientDetailOptions = {
  initialData?: StoreIngredientDetail;
};

/**
 * Hook for fetching store ingredient detail
 */
export function useStoreIngredientDetail(
  ingredientId: string,
  options: UseStoreIngredientDetailOptions = {},
) {
  return useQuery({
    queryKey: [STORE_INGREDIENT_DETAIL_KEY, ingredientId],
    queryFn: () => getStoreIngredient(ingredientId),
    enabled: Boolean(ingredientId),
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
 * Hook for exporting purchase history as CSV
 */
export function useExportPurchaseHistoryMutation(ingredientId: string) {
  return useMutation({
    mutationFn: (filters: PurchaseHistoryFilters) =>
      exportPurchaseHistoryCsv(ingredientId, filters),
  });
}

/**
 * Hook for real-time store ingredient updates via Supabase
 */
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE_INGREDIENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [STORE_INGREDIENT_DETAIL_KEY] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE_INGREDIENTS_KEY] });
    },
  });
}
