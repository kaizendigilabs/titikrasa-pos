import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CACHE_POLICIES } from "@/lib/api/cache-policies";
import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";

import {
  createSupplier,
  deleteCatalogItem,
  deleteSupplier,
  listCatalogItems,
  listSupplierOrders,
  listSuppliers,
  toggleCatalogItem,
  updateCatalogItem,
  updateSupplier,
  createCatalogItem,
  createSupplierLink,
  updateSupplierLink,
  deleteSupplierLink,
} from "./client";
import type {
  CreateCatalogItemPayload,
  SupplierFilters,
  SupplierOrderFilters,
  SupplierCatalogFilters,
  UpdateCatalogItemPayload,
  UpdateSupplierPayload,
  CreateSupplierLinkPayload,
  UpdateSupplierLinkPayload,
} from "./schemas";
import type {
  SupplierCatalogWithLinks,
  SupplierListItem,
  SupplierOrder,
} from "./types";

const SUPPLIERS_KEY = "suppliers";
const SUPPLIER_CATALOG_KEY = "supplierCatalog";
const SUPPLIER_ORDERS_KEY = "supplierOrders";

type SuppliersQuerySnapshot = {
  items: SupplierListItem[];
  meta: unknown;
};

type UseSuppliersOptions = {
  initialData?: Awaited<ReturnType<typeof listSuppliers>>;
};

/**
 * Hook for fetching suppliers list
 */
export function useSuppliers(filters: SupplierFilters, options: UseSuppliersOptions = {}) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, filters],
    queryFn: () => listSuppliers(filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.STATIC,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

/**
 * Updates all suppliers cache queries
 */
function updateSuppliersCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: SuppliersQuerySnapshot) => SuppliersQuerySnapshot,
) {
  queryClient.setQueriesData<SuppliersQuerySnapshot | undefined>(
    { queryKey: [SUPPLIERS_KEY] },
    (current) => {
      if (!current) return current;
      return updater(current);
    }
  );
}

/**
 * Hook for creating a supplier
 */
/**
 * Hook for creating a supplier
 */
export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: (supplier) => {
      updateSuppliersCache(queryClient, (current) => ({
        items: [supplier, ...current.items],
        meta: current.meta,
      }));
    },
  });
}

/**
 * Hook for updating a supplier
 */
export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ supplierId, payload }: { supplierId: string; payload: UpdateSupplierPayload }) =>
      updateSupplier(supplierId, payload),
    onMutate: async ({ supplierId, payload }) => {
        await queryClient.cancelQueries({ queryKey: [SUPPLIERS_KEY] });
        
        updateSuppliersCache(queryClient, (current) => ({
            items: current.items.map((item) => 
                item.id === supplierId ? { ...item, ...payload } : item
            ),
            meta: current.meta
        }));
    },
    onSuccess: (supplier) => {
      updateSuppliersCache(queryClient, (current) => ({
        items: current.items.map((item) => (item.id === supplier.id ? supplier : item)),
        meta: current.meta,
      }));
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    }
  });
}

/**
 * Hook for deleting a supplier
 */
export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteSupplier,
    onMutate: async (supplierId) => {
        await queryClient.cancelQueries({ queryKey: [SUPPLIERS_KEY] });
        
        updateSuppliersCache(queryClient, (current) => ({
            items: current.items.filter((item) => item.id !== supplierId),
            meta: current.meta
        }));
    },
    onSuccess: () => {
       // Confirmed
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    }
  });
}

/**
 * Hook for creating a catalog item
 */
export function useCreateCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateCatalogItemPayload) => createCatalogItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
  });
}

/**
 * Hook for updating a catalog item
 */
export function useUpdateCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ catalogItemId, payload }: { catalogItemId: string; payload: UpdateCatalogItemPayload }) =>
      updateCatalogItem(supplierId, catalogItemId, payload),
    onMutate: async ({ catalogItemId, payload }) => {
        await queryClient.cancelQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
        
        // Optimistic update for catalog list
        // Since we don't have a helper like updateSuppliersCache, and keys have filters,
        // we use setQueriesData to target all catalogs for this supplier.
        queryClient.setQueriesData({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] }, (old: any) => {
            if (!old || !old.items) return old;
            return {
                ...old,
                items: old.items.map((item: any) => 
                    item.id === catalogItemId ? { ...item, ...payload } : item
                )
            };
        });
    },
    onSuccess: () => {
      // confirm
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    }
  });
}

/**
 * Hook for toggling catalog item status
 */
export function useToggleCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ catalogItemId, isActive }: { catalogItemId: string; isActive: boolean }) =>
      toggleCatalogItem(supplierId, catalogItemId, isActive),
    onMutate: async ({ catalogItemId, isActive }) => {
        await queryClient.cancelQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
        
        queryClient.setQueriesData({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] }, (old: any) => {
            if (!old || !old.items) return old;
            return {
                ...old,
                items: old.items.map((item: any) => 
                    item.id === catalogItemId ? { ...item, is_active: isActive } : item
                )
            };
        });
    },
    onSuccess: () => {
      // confirm
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    }
  });
}

/**
 * Hook for deleting a catalog item
 */
export function useDeleteCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (catalogItemId: string) => deleteCatalogItem(supplierId, catalogItemId),
    onMutate: async (catalogItemId) => {
        await queryClient.cancelQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
        
        queryClient.setQueriesData({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] }, (old: any) => {
            if (!old || !old.items) return old;
            return {
                ...old,
                items: old.items.filter((item: any) => item.id !== catalogItemId)
            };
        });
    },
    onSuccess: () => {
      // confirm
    },
    onError: () => {
        void queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    }
  });
}

/**
 * Hook for creating a supplier link
 */
export function useCreateSupplierLinkMutation(supplierId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateSupplierLinkPayload) => createSupplierLink(supplierId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
  });
}

/**
 * Hook for updating a supplier link
 */
export function useUpdateSupplierLinkMutation(supplierId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ linkId, payload }: { linkId: string; payload: UpdateSupplierLinkPayload }) =>
      updateSupplierLink(supplierId, linkId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
  });
}

/**
 * Hook for deleting a supplier link
 */
export function useDeleteSupplierLinkMutation(supplierId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (linkId: string) => deleteSupplierLink(supplierId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
  });
}

type UseSupplierOrdersOptions = {
  initialData?: DataTableQueryResult<SupplierOrder>;
};

/**
 * Hook for fetching supplier orders
 */
export function useSupplierOrders(
  supplierId: string,
  filters: SupplierOrderFilters,
  options: UseSupplierOrdersOptions = {},
) {
  return useQuery({
    queryKey: [SUPPLIER_ORDERS_KEY, supplierId, filters],
    queryFn: () => listSupplierOrders(supplierId, filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.FREQUENT,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

type UseSupplierCatalogOptions = {
  initialData?: DataTableQueryResult<SupplierCatalogWithLinks>;
};

/**
 * Hook for fetching supplier catalog
 */
export function useSupplierCatalogList(
  supplierId: string,
  filters: SupplierCatalogFilters,
  options: UseSupplierCatalogOptions = {},
) {
  return useQuery({
    queryKey: [SUPPLIER_CATALOG_KEY, supplierId, filters],
    queryFn: () => listCatalogItems(supplierId, filters),
    placeholderData: keepPreviousData,
    ...CACHE_POLICIES.STATIC,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}
