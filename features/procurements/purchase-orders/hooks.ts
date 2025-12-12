import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";

import {
  createPurchaseOrder,
  deletePurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
} from "./client";
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrderFilters,
  UpdatePurchaseOrderPayload,
} from "./schemas";
import type { PurchaseOrderListItem } from "./types";

const PURCHASE_ORDERS_KEY = "purchaseOrders";

type PurchaseOrderQuerySnapshot = {
  items: PurchaseOrderListItem[];
  meta: unknown;
};

type UsePurchaseOrdersOptions = {
  initialData?: Awaited<ReturnType<typeof listPurchaseOrders>>;
};

/**
 * Hook for fetching purchase orders list
 */
export function usePurchaseOrders(
  filters: PurchaseOrderFilters,
  options: UsePurchaseOrdersOptions = {},
) {
  return useQuery({
    queryKey: [PURCHASE_ORDERS_KEY, filters],
    queryFn: () => listPurchaseOrders(filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.FREQUENT,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

/**
 * Updates all purchase orders cache queries
 */
function updatePurchaseOrdersCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (snapshot: PurchaseOrderQuerySnapshot) => PurchaseOrderQuerySnapshot,
) {
  queryClient.setQueriesData<PurchaseOrderQuerySnapshot | undefined>(
    { queryKey: [PURCHASE_ORDERS_KEY] },
    (current) => {
      if (!current) return current;
      return updater(current);
    },
  );
}

/**
 * Hook for creating a purchase order
 */
/**
 * Hook for creating a purchase order
 */
export function useCreatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => createPurchaseOrder(payload),
    onSuccess: (purchaseOrder) => {
      updatePurchaseOrdersCache(queryClient, (snapshot) => ({
        items: [purchaseOrder, ...snapshot.items],
        meta: snapshot.meta,
      }));
    },
  });
}

/**
 * Hook for updating a purchase order
 */
export function useUpdatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ purchaseOrderId, payload }: { purchaseOrderId: string; payload: UpdatePurchaseOrderPayload }) =>
      updatePurchaseOrder(purchaseOrderId, payload),
    onMutate: async ({ purchaseOrderId, payload }) => {
       await queryClient.cancelQueries({ queryKey: [PURCHASE_ORDERS_KEY] });
       
       updatePurchaseOrdersCache(queryClient, (snapshot) => ({
           items: snapshot.items.map((item) => {
               if (item.id === purchaseOrderId) {
                   return { 
                       ...item, 
                       ...payload,
                       // status: payload.status ?? item.status // handled by payload spread
                   } as PurchaseOrderListItem; // Casting as payload is partial
               }
               return item;
           }),
           meta: snapshot.meta
       }));
    },
    onSuccess: (purchaseOrder) => {
        // Confirm with server response
      updatePurchaseOrdersCache(queryClient, (snapshot) => ({
        items: snapshot.items.map((item) => (item.id === purchaseOrder.id ? purchaseOrder : item)),
        meta: snapshot.meta,
      }));
    },
    onError: () => {
         void queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_KEY] });
    }
  });
}

/**
 * Hook for deleting a purchase order
 */
export function useDeletePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (purchaseOrderId: string) => deletePurchaseOrder(purchaseOrderId),
    onMutate: async (purchaseOrderId) => {
        await queryClient.cancelQueries({ queryKey: [PURCHASE_ORDERS_KEY] });
        
        updatePurchaseOrdersCache(queryClient, (snapshot) => ({
            items: snapshot.items.filter((item) => item.id !== purchaseOrderId),
            meta: snapshot.meta
        }));
    },
    onSuccess: () => {
       // Confirmed
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_KEY] });
    }
  });
}
