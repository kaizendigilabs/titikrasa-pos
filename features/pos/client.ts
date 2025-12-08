import { apiClient } from "@/lib/api/client";

import type { MenuListItem } from "@/features/menus/types";
import type { ResellerListItem } from "@/features/resellers/types";

const POS_MENUS_ENDPOINT = "/api/pos/menus" as const;
const POS_RESELLERS_ENDPOINT = "/api/resellers" as const;
const POS_SETTINGS_ENDPOINT = "/api/settings" as const;

type PosMenusResponse = {
  items: MenuListItem[];
};

type PosResellersResponse = {
  items: ResellerListItem[];
};

type PosSettingsData = {
  tax?: { rate?: number };
};

type PosSettingsResponse = {
  defaultTaxRate: number;
};

/**
 * Fetches active menus for POS
 */
export async function fetchPosMenus(): Promise<MenuListItem[]> {
  const { data } = await apiClient.get<PosMenusResponse>(POS_MENUS_ENDPOINT);
  return data.items;
}

/**
 * Fetches active resellers for POS
 */
export async function fetchPosResellers(): Promise<ResellerListItem[]> {
  const { data } = await apiClient.get<PosResellersResponse>(
    `${POS_RESELLERS_ENDPOINT}?isActive=true&pageSize=1000`
  );
  return data.items;
}

/**
 * Fetches POS settings (tax rate, etc)
 */
export async function fetchPosSettings(): Promise<PosSettingsResponse> {
  const { data } = await apiClient.get<PosSettingsData>(POS_SETTINGS_ENDPOINT);
  return {
    defaultTaxRate: data.tax?.rate ?? 0.11,
  };
}
