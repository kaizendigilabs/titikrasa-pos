import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import {
  createCatalogItem,
  createSupplier,
  createSupplierLink,
  deleteCatalogItem,
  deleteSupplier,
  deleteSupplierLink,
  listCatalogItems,
  listSuppliers,
  toggleCatalogItem,
  updateCatalogItem,
  updateSupplier,
  updateSupplierLink,
  type SupplierListMeta,
} from "./api";
import type {
  CreateCatalogItemPayload,
  CreateSupplierLinkPayload,
  SupplierFilters,
  UpdateCatalogItemPayload,
  UpdateSupplierLinkPayload,
  UpdateSupplierPayload,
} from "./forms/schema";
import type { SupplierCatalogItem, SupplierListItem } from "../types";
import { createBrowserClient } from "@/lib/supabase/client";

const SUPPLIERS_KEY = "suppliers";
const SUPPLIER_CATALOG_KEY = "supplierCatalog";

export type SuppliersQuerySnapshot = {
  items: SupplierListItem[];
  meta: SupplierListMeta | null;
};

type UseSuppliersOptions = {
  initialData?: Awaited<ReturnType<typeof listSuppliers>>;
};

function adjustMetaTotal(meta: SupplierListMeta | null, delta: number): SupplierListMeta | null {
  if (!meta) return meta;
  const pagination = meta.pagination ?? null;
  if (!pagination) return meta;
  const total = Math.max(0, (pagination.total ?? 0) + delta);
  return {
    ...meta,
    pagination: {
      ...pagination,
      total,
    },
  };
}

function updateSuppliersCache(
  queryClient: QueryClient,
  updater: (snapshot: SuppliersQuerySnapshot) => SuppliersQuerySnapshot,
) {
  queryClient.setQueriesData<SuppliersQuerySnapshot | undefined>({ queryKey: [SUPPLIERS_KEY] }, (current) => {
    if (!current) return current;
    return updater(current);
  });
}

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

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: (supplier) => {
      updateSuppliersCache(queryClient, (snapshot) => ({
        items: [supplier, ...snapshot.items],
        meta: adjustMetaTotal(snapshot.meta, 1),
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
      updateSuppliersCache(queryClient, (snapshot) => ({
        items: snapshot.items.map((item) => (item.id === supplier.id ? supplier : item)),
        meta: snapshot.meta,
      }));
    },
  });
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (supplierId: string) => deleteSupplier(supplierId),
    onSuccess: (_result, supplierId) => {
      updateSuppliersCache(queryClient, (snapshot) => {
        const nextItems = snapshot.items.filter((item) => item.id !== supplierId);
        if (nextItems.length === snapshot.items.length) {
          return snapshot;
        }
        return {
          items: nextItems,
          meta: adjustMetaTotal(snapshot.meta, -1),
        };
      });
    },
  });
}

type CatalogOptions = {
  supplierId: string;
  enabled?: boolean;
};

export function useSupplierCatalog({ supplierId, enabled = true }: CatalogOptions) {
  return useQuery({
    queryKey: [SUPPLIER_CATALOG_KEY, supplierId],
    queryFn: () => listCatalogItems(supplierId),
    enabled: enabled && Boolean(supplierId),
  });
}

function updateCatalogCache(
  queryClient: QueryClient,
  supplierId: string,
  updater: (items: SupplierCatalogItem[]) => SupplierCatalogItem[],
) {
  queryClient.setQueryData<SupplierCatalogItem[] | undefined>(
    [SUPPLIER_CATALOG_KEY, supplierId],
    (current) => {
      if (!current) return current;
      return updater(current);
    },
  );
}

export function useCreateCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCatalogItemPayload) => createCatalogItem(payload),
    onSuccess: (item) => {
      updateCatalogCache(queryClient, supplierId, (items) => [item, ...items]);
    },
  });
}

export function useUpdateCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ catalogItemId, payload }: { catalogItemId: string; payload: UpdateCatalogItemPayload }) =>
      updateCatalogItem(supplierId, catalogItemId, payload),
    onSuccess: (item) => {
      updateCatalogCache(queryClient, supplierId, (items) =>
        items.map((existing) => (existing.id === item.id ? item : existing)),
      );
    },
  });
}

export function useToggleCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ catalogItemId, isActive }: { catalogItemId: string; isActive: boolean }) =>
      toggleCatalogItem(supplierId, catalogItemId, isActive),
    onSuccess: (item) => {
      updateCatalogCache(queryClient, supplierId, (items) =>
        items.map((existing) => (existing.id === item.id ? item : existing)),
      );
    },
  });
}

export function useDeleteCatalogItemMutation(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (catalogItemId: string) => deleteCatalogItem(supplierId, catalogItemId),
    onSuccess: (_result, catalogItemId) => {
      updateCatalogCache(queryClient, supplierId, (items) =>
        items.filter((item) => item.id !== catalogItemId),
      );
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

type RealtimeOptions = {
  enabled?: boolean;
};

export function useSuppliersRealtime({ enabled = true }: RealtimeOptions = {}) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("suppliers-table")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        () => {
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
