import type { OrderFilters } from "@/features/orders/types";

const POS_MENUS_KEY = "pos-menus";
const POS_RESELLERS_KEY = "pos-resellers";
const POS_SETTINGS_KEY = "pos-settings";

/**
 * Query key for POS menus list
 */
export function posMenusQueryKey() {
  return [POS_MENUS_KEY] as const;
}

/**
 * Query key for POS resellers list
 */
export function posResellersQueryKey() {
  return [POS_RESELLERS_KEY] as const;
}

/**
 * Query key for POS settings (tax rate, etc)
 */
export function posSettingsQueryKey() {
  return [POS_SETTINGS_KEY] as const;
}

/**
 * Default order filters for POS
 */
export const DEFAULT_POS_ORDER_FILTERS: OrderFilters = {
  channel: "all",
  status: "open",
  paymentStatus: "all",
  limit: 20,
};
