import type { OrderFilters } from "./types";

const ORDERS_QUERY_KEY = "pos-orders";

/**
 * Query key for orders list
 */
export function ordersQueryKey(filters: OrderFilters) {
  return [ORDERS_QUERY_KEY, filters] as const;
}
