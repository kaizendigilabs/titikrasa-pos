/**
 * Standardized cache policies for React Query
 * 
 * These policies define how long data should be considered fresh (staleTime)
 * and when to automatically refetch data. Use these constants instead of
 * hardcoding cache configuration in individual hooks.
 * 
 * @see {@link https://tanstack.com/query/latest/docs/react/guides/caching}
 */

/**
 * Cache policy for real-time data that changes frequently
 * 
 * Use for: Orders, inventory stock levels, live dashboards
 * 
 * - staleTime: 5 seconds - Data considered fresh for 5s
 * - refetchInterval: 10 seconds - Auto-refetch every 10s
 * - refetchOnWindowFocus: true - Refetch when user returns to tab
 * - refetchOnReconnect: true - Refetch when internet reconnects
 * 
 * @example
 * ```typescript
 * export function useOrders(filters: OrderFilters) {
 *   return useQuery({
 *     queryKey: ['orders', filters],
 *     queryFn: () => listOrders(filters),
 *     ...CACHE_POLICIES.REALTIME,
 *   });
 * }
 * ```
 */
const REALTIME = {
  staleTime: 5 * 1000,
  refetchInterval: 10 * 1000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

/**
 * Cache policy for frequently changing data
 * 
 * Use for: Dashboard metrics, reports, analytics
 * 
 * - staleTime: 30 seconds - Data considered fresh for 30s
 * - refetchInterval: 60 seconds - Auto-refetch every minute
 * - refetchOnWindowFocus: true - Refetch when user returns to tab
 * - refetchOnReconnect: true - Refetch when internet reconnects
 * 
 * @example
 * ```typescript
 * export function useDashboardSummary(range: DateRangeType) {
 *   return useQuery({
 *     queryKey: ['dashboard-summary', range],
 *     queryFn: () => fetchDashboardSummary(range),
 *     ...CACHE_POLICIES.FREQUENT,
 *   });
 * }
 * ```
 */
const FREQUENT = {
  staleTime: 30 * 1000,
  refetchInterval: 60 * 1000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

/**
 * Cache policy for rarely changing data
 * 
 * Use for: Settings, master data (menus, categories, suppliers)
 * 
 * - staleTime: 5 minutes - Data considered fresh for 5 minutes
 * - refetchOnWindowFocus: false - Don't refetch on tab focus
 * - refetchOnReconnect: true - Refetch when internet reconnects
 * 
 * @example
 * ```typescript
 * export function useMenus(filters: MenuFilters) {
 *   return useQuery({
 *     queryKey: ['menus', filters],
 *     queryFn: () => listMenus(filters),
 *     ...CACHE_POLICIES.STATIC,
 *   });
 * }
 * ```
 */
const STATIC = {
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

/**
 * Cache policy for data that never changes
 * 
 * Use for: User profile, app constants, configuration
 * 
 * - staleTime: Infinity - Data never becomes stale
 * - refetchOnWindowFocus: false - Never refetch on tab focus
 * - refetchOnReconnect: false - Never refetch on reconnect
 * 
 * @example
 * ```typescript
 * export function useUserProfile() {
 *   return useQuery({
 *     queryKey: ['user-profile'],
 *     queryFn: () => fetchUserProfile(),
 *     ...CACHE_POLICIES.PERMANENT,
 *   });
 * }
 * ```
 */
const PERMANENT = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

/**
 * Exported cache policies object
 * 
 * Always use these predefined policies instead of hardcoding cache configuration.
 * This ensures consistent caching behavior across the entire application.
 * 
 * @example
 * ```typescript
 * import { CACHE_POLICIES } from '@/lib/api/cache-policies';
 * 
 * // For real-time data
 * ...CACHE_POLICIES.REALTIME
 * 
 * // For frequently changing data
 * ...CACHE_POLICIES.FREQUENT
 * 
 * // For static master data
 * ...CACHE_POLICIES.STATIC
 * 
 * // For permanent data
 * ...CACHE_POLICIES.PERMANENT
 * ```
 */
export const CACHE_POLICIES = {
  REALTIME,
  FREQUENT,
  STATIC,
  PERMANENT,
} as const;

/**
 * Type helper for cache policy keys
 */
export type CachePolicyType = keyof typeof CACHE_POLICIES;
