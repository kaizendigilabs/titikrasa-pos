import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import { CACHE_POLICIES } from "@/lib/api/cache-policies";
import { createBrowserClient } from "@/lib/supabase/client";
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
    onSuccess: (supplier) => {
      updateSuppliersCache(queryClient, (current) => ({
        items: current.items.map((item) => (item.id === supplier.id ? supplier : item)),
        meta: current.meta,
      }));
    },
  });
}

/**
 * Hook for deleting a supplier
 */
export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: (_result, supplierId) => {
      updateSuppliersCache(queryClient, (current) => ({
        items: current.items.filter((item) => item.id !== supplierId),
        meta: current.meta,
      }));
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
  });
}

/**
 * Hook for deleting a catalog item
 */
export function useDeleteCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (catalogItemId: string) => deleteCatalogItem(supplierId, catalogItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
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

type SupplierRealtimeOptions = {
  enabled?: boolean;
};

/**
 * Hook for real-time supplier updates via Supabase
 */
export function useSuppliersRealtime({ enabled = true }: SupplierRealtimeOptions = {}) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("suppliers-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        (payload) => {
          const supplier = payload.new ?? payload.old;
          if (!supplier) return;
          queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "supplier_catalog_items" },
        () => {
          queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
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
