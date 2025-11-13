import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

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
import { createBrowserClient } from "@/lib/supabase/client";
import type { DataTableQueryResult } from "@/components/tables/use-data-table-state";

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

export function useSuppliers(filters: SupplierFilters, options: UseSuppliersOptions = {}) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, filters],
    queryFn: () => listSuppliers(filters),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

function updateSuppliersCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: SuppliersQuerySnapshot) => SuppliersQuerySnapshot,
) {
  queryClient.setQueriesData<SuppliersQuerySnapshot | undefined>({ queryKey: [SUPPLIERS_KEY] }, (current) => {
    if (!current) return current;
    return updater(current);
  });
}

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

export function useCreateCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCatalogItemPayload) => createCatalogItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
  });
}

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

export function useDeleteCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (catalogItemId: string) => deleteCatalogItem(supplierId, catalogItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
  });
}

export function useCreateSupplierLinkMutation(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplierLinkPayload) => createSupplierLink(supplierId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_CATALOG_KEY, supplierId] });
    },
  });
}

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

export function useSupplierOrders(
  supplierId: string,
  filters: SupplierOrderFilters,
  options: UseSupplierOrdersOptions = {},
) {
  return useQuery({
    queryKey: [SUPPLIER_ORDERS_KEY, supplierId, filters],
    queryFn: () => listSupplierOrders(supplierId, filters),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}

type UseSupplierCatalogOptions = {
  initialData?: DataTableQueryResult<SupplierCatalogWithLinks>;
};

export function useSupplierCatalogList(
  supplierId: string,
  filters: SupplierCatalogFilters,
  options: UseSupplierCatalogOptions = {},
) {
  return useQuery({
    queryKey: [SUPPLIER_CATALOG_KEY, supplierId, filters],
    queryFn: () => listCatalogItems(supplierId, filters),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 30,
    ...(options.initialData ? { initialData: options.initialData } : {}),
  });
}
