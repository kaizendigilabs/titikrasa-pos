import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";
import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";

import {
  createReseller,
  deleteReseller,
  listResellerOrders,
  listResellers,
  toggleResellerStatus,
  updateReseller,
  type ResellerListMeta,
} from "./client";
import type {
  ResellerFilters,
  ResellerOrderFilters,
  UpdateResellerPayload,
} from "./schemas";
import type { ResellerListItem, ResellerOrder } from "./types";

const RESELLERS_KEY = "resellers";
const RESELLER_ORDERS_KEY = "reseller-orders";

type UseResellersOptions = {
  initialData?: Awaited<ReturnType<typeof listResellers>>;
};

type ResellersQuerySnapshot = {
  items: ResellerListItem[];
  meta: ResellerListMeta | null;
};

/**
 * Adjusts pagination total by delta
 */
function adjustMetaTotal(
  meta: ResellerListMeta | null,
  delta: number,
): ResellerListMeta | null {
  if (!meta) return meta;
  const pagination = meta.pagination ?? null;
  if (!pagination) return meta;
  const nextTotal = Math.max(0, (pagination.total ?? 0) + delta);
  return {
    ...meta,
    pagination: {
      ...pagination,
      total: nextTotal,
    },
  };
}

/**
 * Updates all resellers cache queries
 */
function updateResellersCache(
  queryClient: QueryClient,
  updater: (current: ResellersQuerySnapshot) => ResellersQuerySnapshot,
) {
  queryClient.setQueriesData<ResellersQuerySnapshot | undefined>(
    { queryKey: [RESELLERS_KEY] },
    (current) => {
      if (!current) return current;
      return updater(current);
    },
  );
}

/**
 * Hook for fetching resellers list
 */
export function useResellers(filters: ResellerFilters, options: UseResellersOptions = {}) {
  return useQuery({
    queryKey: [RESELLERS_KEY, filters],
    queryFn: () => listResellers(filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.STATIC,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

/**
 * Hook for creating a reseller
 */
/**
 * Hook for creating a reseller
 */
export function useCreateResellerMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createReseller,
    onSuccess: (reseller) => {
      updateResellersCache(queryClient, (current) => {
        const exists = current.items.some((item) => item.id === reseller.id);
        const items = exists
          ? current.items.map((item) =>
              item.id === reseller.id ? reseller : item,
            )
          : [reseller, ...current.items];
        const meta = adjustMetaTotal(current.meta, exists ? 0 : 1);
        return { items, meta };
      });
    },
  });
}

/**
 * Hook for updating a reseller
 */
export function useUpdateResellerMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ resellerId, input }: { resellerId: string; input: UpdateResellerPayload }) =>
      updateReseller(resellerId, input),
    onMutate: async ({ resellerId, input }) => {
        await queryClient.cancelQueries({ queryKey: [RESELLERS_KEY] });
        
        updateResellersCache(queryClient, (current) => ({
            items: current.items.map((item) =>
              item.id === resellerId ? { ...item, ...input } : item,
            ),
            meta: current.meta,
        }));
    },
    onSuccess: (reseller) => {
      updateResellersCache(queryClient, (current) => ({
        items: current.items.map((item) =>
          item.id === reseller.id ? reseller : item,
        ),
        meta: current.meta,
      }));
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [RESELLERS_KEY] });
    }
  });
}

/**
 * Hook for toggling reseller status
 */
export function useToggleResellerStatusMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      resellerId,
      isActive,
    }: {
      resellerId: string;
      isActive: boolean;
    }) => toggleResellerStatus(resellerId, isActive),
    onMutate: async ({ resellerId, isActive }) => {
        await queryClient.cancelQueries({ queryKey: [RESELLERS_KEY] });
        
        updateResellersCache(queryClient, (current) => ({
            items: current.items.map((item) =>
              item.id === resellerId ? { ...item, is_active: isActive } : item,
            ),
            meta: current.meta,
        }));
    },
    onSuccess: () => {
      // confirmed
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [RESELLERS_KEY] });
    }
  });
}

/**
 * Hook for deleting a reseller
 */
export function useDeleteResellerMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (resellerId: string) => deleteReseller(resellerId),
    onMutate: async (resellerId) => {
        await queryClient.cancelQueries({ queryKey: [RESELLERS_KEY] });
        
        updateResellersCache(queryClient, (current) => {
            const nextItems = current.items.filter((item) => item.id !== resellerId);
            if (nextItems.length === current.items.length) {
              return current;
            }
            return {
              items: nextItems,
              meta: adjustMetaTotal(current.meta, -1),
            };
        });
    },
    onSuccess: () => {
       // Confirmed
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [RESELLERS_KEY] });
    }
  });
}

type UseResellerOrdersOptions = {
  initialData?: DataTableQueryResult<ResellerOrder>;
};

/**
 * Hook for fetching reseller orders
 */
export function useResellerOrders(
  resellerId: string,
  filters: ResellerOrderFilters,
  options: UseResellerOrdersOptions = {},
) {
  return useQuery({
    queryKey: [RESELLER_ORDERS_KEY, resellerId, filters],
    queryFn: () => listResellerOrders(resellerId, filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.FREQUENT,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}
