"use client";

import * as React from "react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
  type Table,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { createPurchaseOrderColumns } from "./columns";
import {
  buildCreatePurchaseOrderInput,
  clearPurchaseOrderFormError,
  createDefaultPurchaseOrderFormState,
  normalizeFilters,
  type PurchaseOrderFormErrors,
  type PurchaseOrderFormItemState,
  type PurchaseOrderFormState,
} from "./forms/state";
import type { PurchaseOrderFilters, PurchaseOrderStatus } from "./forms/schema";
import {
  useCreatePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  usePurchaseOrders,
  usePurchaseOrdersRealtime,
  useUpdatePurchaseOrderMutation,
} from "./queries";
import type { PurchaseOrderListItem } from "../types";

export type PurchaseOrderSupplier = {
  id: string;
  name: string;
  isActive: boolean;
};

export type PurchaseOrderCatalogLink = {
  id: string;
  storeIngredientId: string;
  ingredientName: string;
  baseUom: string | null;
  preferred: boolean;
  lastPurchasePrice: number | null;
  lastPurchasedAt: string | null;
};

export type PurchaseOrderCatalogItem = {
  id: string;
  supplierId: string;
  name: string;
  baseUom: string;
  purchasePrice: number;
  isActive: boolean;
  createdAt: string;
  links: PurchaseOrderCatalogLink[];
};

export type PurchaseOrdersTableOptions = {
  initialItems: PurchaseOrderListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { status: "all" | PurchaseOrderStatus; search: string | null };
  } | null;
  suppliers: PurchaseOrderSupplier[];
  catalogItems: PurchaseOrderCatalogItem[];
  canManage: boolean;
};

type ToolbarState = {
  search: {
    term: string;
    setTerm: (value: string) => void;
    apply: () => void;
  };
  status: {
    value: "all" | PurchaseOrderStatus;
    setValue: (value: "all" | PurchaseOrderStatus) => void;
  };
  reset: () => void;
  canManage: boolean;
};

type PaginationController = {
  page: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

export type SheetController = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  isSubmitting: boolean;
  values: PurchaseOrderFormState;
  errors: PurchaseOrderFormErrors;
  suppliers: PurchaseOrderSupplier[];
  catalogItems: PurchaseOrderCatalogItem[];
  activeCatalogItems: PurchaseOrderCatalogItem[];
  onSupplierChange: (supplierId: string) => void;
  onStatusChange: (status: PurchaseOrderStatus) => void;
  onIssuedAtChange: (issuedAt: string) => void;
  onItemChange: (
    index: number,
    key: keyof PurchaseOrderFormItemState,
    value: string,
  ) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  submit: () => Promise<void>;
};

export type DetailController = {
  purchaseOrder: PurchaseOrderListItem | null;
  open: (purchaseOrder: PurchaseOrderListItem) => void;
  close: () => void;
  updateStatus: (status: PurchaseOrderStatus) => Promise<void>;
  isUpdating: boolean;
  delete: () => Promise<void>;
  isDeleting: boolean;
  deletingId: string | null;
};

type TableState = {
  table: Table<PurchaseOrderListItem>;
  isLoading: boolean;
  isSyncing: boolean;
  toolbar: ToolbarState;
  pagination: PaginationController;
  sheet: SheetController;
  detail: DetailController;
  refetch: () => void;
  totalCount: number;
};

function buildInitialFilters(
  initialMeta: PurchaseOrdersTableOptions["initialMeta"],
): PurchaseOrderFilters {
  return {
    page: initialMeta?.pagination.page ?? 1,
    pageSize: initialMeta?.pagination.pageSize ?? 25,
    status: initialMeta?.filters.status ?? "all",
    search: initialMeta?.filters.search ?? undefined,
  };
}

export function usePurchaseOrdersTableViewModel({
  initialItems,
  initialMeta,
  suppliers,
  catalogItems,
  canManage,
}: PurchaseOrdersTableOptions): TableState {
  const [searchTerm, setSearchTerm] = React.useState(
    initialMeta?.filters.search ?? "",
  );
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | PurchaseOrderStatus
  >(initialMeta?.filters.status ?? "all");
  const [filters, setFilters] = React.useState<PurchaseOrderFilters>(() =>
    buildInitialFilters(initialMeta),
  );

  const [formState, setFormState] = React.useState<PurchaseOrderFormState>(
    createDefaultPurchaseOrderFormState(),
  );
  const [formErrors, setFormErrors] = React.useState<PurchaseOrderFormErrors>({});
  const [isSheetOpen, setSheetOpen] = React.useState(false);

  const [currentDetail, setCurrentDetail] = React.useState<
    PurchaseOrderListItem | null
  >(null);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(
    null,
  );
  const [pendingStatusId, setPendingStatusId] = React.useState<string | null>(
    null,
  );

  const normalizedFilters = React.useMemo(
    () => normalizeFilters(filters),
    [filters],
  );

  const initialData = React.useMemo(
    () => ({
      items: initialItems,
      meta: initialMeta ?? {
        pagination: {
          page: filters.page,
          pageSize: filters.pageSize,
          total: initialItems.length,
        },
        filters: {
          status: filters.status,
          search: filters.search ?? null,
        },
      },
    }),
    [filters.page, filters.pageSize, filters.search, filters.status, initialItems, initialMeta],
  );

  const purchaseOrdersQuery = usePurchaseOrders(normalizedFilters, {
    initialData,
  });

  usePurchaseOrdersRealtime(normalizedFilters, { enabled: true });

  const createMutation = useCreatePurchaseOrderMutation(normalizedFilters);
  const updateMutation = useUpdatePurchaseOrderMutation(normalizedFilters);
  const deleteMutation = useDeletePurchaseOrderMutation(normalizedFilters);

  const items = purchaseOrdersQuery.data?.items ?? initialItems;
  const paginationMeta =
    purchaseOrdersQuery.data?.meta?.pagination ??
    initialMeta?.pagination ?? {
      page: filters.page,
      pageSize: filters.pageSize,
      total: items.length,
    };

  const pageCount = React.useMemo(() => {
    const total = paginationMeta.total ?? items.length;
    const size = Math.max(1, paginationMeta.pageSize ?? filters.pageSize);
    return Math.max(1, Math.ceil(total / size));
  }, [filters.pageSize, items.length, paginationMeta.pageSize, paginationMeta.total]);

  const catalogsBySupplier = React.useMemo(() => {
    const map = new Map<string, PurchaseOrderCatalogItem[]>();
    for (const item of catalogItems) {
      if (!map.has(item.supplierId)) {
        map.set(item.supplierId, []);
      }
      map.get(item.supplierId)!.push(item);
    }
    return map;
  }, [catalogItems]);

  const resolveCatalog = React.useCallback(
    (catalogItemId: string) => {
      const entry = catalogItems.find((item) => item.id === catalogItemId);
      if (!entry || !entry.isActive) {
        return null;
      }
      return { id: entry.id, purchase_price: entry.purchasePrice };
    },
    [catalogItems],
  );

  const activeCatalogItems = React.useMemo(() => {
    if (!formState.supplierId) return [] as PurchaseOrderCatalogItem[];
    return (
      catalogsBySupplier.get(formState.supplierId)?.filter((item) => item.isActive) ?? []
    );
  }, [catalogsBySupplier, formState.supplierId]);

  const handleView = React.useCallback((purchaseOrder: PurchaseOrderListItem) => {
    setCurrentDetail(purchaseOrder);
  }, []);

  const handleDelete = React.useCallback(
    async (purchaseOrder: PurchaseOrderListItem) => {
      try {
        setPendingDeleteId(purchaseOrder.id);
        await deleteMutation.mutateAsync(purchaseOrder.id);
        toast.success("Purchase order dihapus");
        setCurrentDetail((current) =>
          current?.id === purchaseOrder.id ? null : current,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Gagal menghapus purchase order";
        toast.error(message);
      } finally {
        setPendingDeleteId(null);
      }
    },
    [deleteMutation],
  );

  const columns = React.useMemo(
    () =>
      createPurchaseOrderColumns(
        canManage
          ? {
              onView: handleView,
              onDelete: handleDelete,
              pendingDeleteId,
              disableActions:
                deleteMutation.isPending || updateMutation.isPending,
            }
          : {
              onView: handleView,
              disableActions: updateMutation.isPending,
            },
      ),
    [
      canManage,
      deleteMutation.isPending,
      handleDelete,
      handleView,
      pendingDeleteId,
      updateMutation.isPending,
    ],
  );

  const table = useReactTable({
    data: items,
    columns,
    manualPagination: true,
    pageCount,
    state: {
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.pageSize,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: (updater) => {
      setFilters((prev) => {
        const current: PaginationState = {
          pageIndex: prev.page - 1,
          pageSize: prev.pageSize,
        };
        const next =
          typeof updater === "function" ? updater(current) : updater;
        return {
          ...prev,
          page: next.pageIndex + 1,
          pageSize: next.pageSize,
        };
      });
    },
  });

  const handleSubmit = React.useCallback(async () => {
    const result = buildCreatePurchaseOrderInput(formState, {
      resolveCatalog,
    });
    if (!result.result) {
      setFormErrors(result.errors);
      if (result.errors.global) {
        toast.error(result.errors.global);
      }
      return;
    }

    try {
      await createMutation.mutateAsync(result.result);
      toast.success("Purchase order dibuat");
      setSheetOpen(false);
      setFormState(createDefaultPurchaseOrderFormState());
      setFormErrors({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal membuat purchase order";
      toast.error(message);
    }
  }, [createMutation, formState, resolveCatalog]);

  const sheet = React.useMemo<SheetController>(() => ({
    isOpen: isSheetOpen,
    open: () => {
      if (!canManage) return;
      setSheetOpen(true);
    },
    close: () => {
      setSheetOpen(false);
      setFormState(createDefaultPurchaseOrderFormState());
      setFormErrors({});
    },
    isSubmitting: createMutation.isPending,
    values: formState,
    errors: formErrors,
    suppliers,
    catalogItems,
    activeCatalogItems,
    onSupplierChange: (supplierId) => {
      setFormState((prev) => ({
        ...prev,
        supplierId,
        items: [{ catalogItemId: "", qty: "1" }],
      }));
      setFormErrors((prev) => ({ ...prev, items: undefined }));
    },
    onStatusChange: (status) => {
      setFormState((prev) => ({ ...prev, status }));
      setFormErrors((prev) => clearPurchaseOrderFormError(prev, "status"));
    },
    onIssuedAtChange: (issuedAt) => {
      setFormState((prev) => ({ ...prev, issuedAt }));
      setFormErrors((prev) => clearPurchaseOrderFormError(prev, "issuedAt"));
    },
    onItemChange: (index, key, value) => {
      setFormState((prev) => {
        const nextItems = [...prev.items];
        const current = nextItems[index] ?? { catalogItemId: "", qty: "1" };
        nextItems[index] = { ...current, [key]: value };
        return { ...prev, items: nextItems };
      });
      setFormErrors((prev) => {
        const existing = prev.items?.[index];
        if (!existing) return prev;
        const nextItems = [...(prev.items ?? [])];
        nextItems[index] = { ...existing, [key]: undefined };
        return { ...prev, items: nextItems };
      });
    },
    addItem: () => {
      if (!formState.supplierId) {
        toast.error("Pilih supplier terlebih dahulu");
        return;
      }
      if (activeCatalogItems.length === 0) {
        toast.error("Supplier belum memiliki item katalog aktif");
        return;
      }
      setFormState((prev) => ({
        ...prev,
        items: [...prev.items, { catalogItemId: "", qty: "1" }],
      }));
    },
    removeItem: (index) => {
      setFormState((prev) => {
        if (prev.items.length <= 1) {
          return prev;
        }
        const nextItems = prev.items.filter((_, idx) => idx !== index);
        return { ...prev, items: nextItems };
      });
      setFormErrors((prev) => {
        if (!prev.items) return prev;
        const nextItems = prev.items.filter((_, idx) => idx !== index);
        return { ...prev, items: nextItems };
      });
    },
    submit: handleSubmit,
  }), [
    activeCatalogItems,
    canManage,
    catalogItems,
    createMutation.isPending,
    formErrors,
    formState,
    handleSubmit,
    suppliers,
    isSheetOpen,
  ]);

  const detail = React.useMemo<DetailController>(() => ({
    purchaseOrder: currentDetail,
    open: (purchaseOrder) => {
      setCurrentDetail(purchaseOrder);
    },
    close: () => {
      setCurrentDetail(null);
    },
    updateStatus: async (status) => {
      if (!currentDetail) return;
      try {
        setPendingStatusId(currentDetail.id);
        const updated = await updateMutation.mutateAsync({
          purchaseOrderId: currentDetail.id,
          payload: { status },
        });
        setCurrentDetail(updated);
        toast.success(`Status PO diubah menjadi ${status}`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Gagal memperbarui status purchase order";
        toast.error(message);
      } finally {
        setPendingStatusId(null);
      }
    },
    isUpdating: updateMutation.isPending && pendingStatusId === currentDetail?.id,
    delete: async () => {
      if (!currentDetail) return;
      await handleDelete(currentDetail);
    },
    isDeleting: deleteMutation.isPending && pendingDeleteId === currentDetail?.id,
    deletingId: pendingDeleteId,
  }), [
    currentDetail,
    deleteMutation.isPending,
    handleDelete,
    pendingDeleteId,
    pendingStatusId,
    updateMutation,
  ]);

  const toolbar = React.useMemo<ToolbarState>(() => ({
    search: {
      term: searchTerm,
      setTerm: setSearchTerm,
      apply: () => {
        setFilters((prev) => ({
          ...prev,
          page: 1,
          search: searchTerm.trim() ? searchTerm.trim() : undefined,
        }));
      },
    },
    status: {
      value: statusFilter,
      setValue: (value) => {
        setStatusFilter(value);
        setFilters((prev) => ({
          ...prev,
          page: 1,
          status: value,
        }));
      },
    },
    reset: () => {
      setSearchTerm("");
      setStatusFilter("all");
      setFilters((prev) => ({
        ...prev,
        page: 1,
        search: undefined,
        status: "all",
      }));
    },
    canManage,
  }), [canManage, searchTerm, statusFilter]);

  const pagination = React.useMemo<PaginationController>(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      total: paginationMeta.total ?? items.length,
      setPage: (page) => {
        setFilters((prev) => ({ ...prev, page }));
      },
      setPageSize: (pageSize) => {
        setFilters((prev) => ({ ...prev, pageSize, page: 1 }));
      },
    }),
    [filters.page, filters.pageSize, items.length, paginationMeta.total],
  );

  return {
    table,
    isLoading: purchaseOrdersQuery.isPending && !purchaseOrdersQuery.data,
    isSyncing: purchaseOrdersQuery.isFetching,
    toolbar,
    pagination,
    sheet,
    detail,
    refetch: () => {
      void purchaseOrdersQuery.refetch();
    },
    totalCount: paginationMeta.total ?? items.length,
  };
}
