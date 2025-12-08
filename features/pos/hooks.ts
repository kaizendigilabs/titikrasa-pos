"use client";

import { useQuery } from "@tanstack/react-query";

import { CACHE_POLICIES } from "@/lib/api/cache-policies";

import type { MenuListItem } from "@/features/menus/types";
import type { ResellerListItem } from "@/features/resellers/types";
import { fetchPosMenus, fetchPosResellers, fetchPosSettings } from "./client";
import {
  posMenusQueryKey,
  posResellersQueryKey,
  posSettingsQueryKey,
} from "./keys";

// Re-export query keys for external usage
export {
  posMenusQueryKey,
  posResellersQueryKey,
  posSettingsQueryKey,
  DEFAULT_POS_ORDER_FILTERS,
} from "./keys";

type UsePosMenusOptions = {
  initialData?: MenuListItem[];
};

/**
 * Hook for fetching POS menus with caching
 */
export function usePosMenus(options?: UsePosMenusOptions) {
  return useQuery({
    queryKey: posMenusQueryKey(),
    queryFn: fetchPosMenus,
    ...CACHE_POLICIES.STATIC,
    initialData: options?.initialData,
  });
}

type UsePosResellersOptions = {
  initialData?: ResellerListItem[];
};

/**
 * Hook for fetching POS resellers with caching
 */
export function usePosResellers(options?: UsePosResellersOptions) {
  return useQuery({
    queryKey: posResellersQueryKey(),
    queryFn: fetchPosResellers,
    ...CACHE_POLICIES.STATIC,
    initialData: options?.initialData,
  });
}

type UsePosSettingsOptions = {
  initialData?: { defaultTaxRate: number };
};

/**
 * Hook for fetching POS settings with caching
 */
export function usePosSettings(options?: UsePosSettingsOptions) {
  return useQuery({
    queryKey: posSettingsQueryKey(),
    queryFn: fetchPosSettings,
    ...CACHE_POLICIES.PERMANENT,
    initialData: options?.initialData,
  });
}
