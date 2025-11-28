"use client";

import * as React from "react";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import type { DataTableRenderContext } from "@/components/tables/data-table";
import {
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
} from "@/components/tables/use-data-table-state";
import { DataTableToolbarProps } from "@/components/tables/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { createPurchaseOrderColumns } from "../columns";
import {
  useCreatePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  usePurchaseOrders,
  usePurchaseOrdersRealtime,
  useUpdatePurchaseOrderMutation,
} from "@/features/procurements/purchase-orders/hooks";
import {
  createPurchaseOrderSchema,
  type PurchaseOrderFilters,
  type PurchaseOrderItemPayload,
  updatePurchaseOrderSchema,
} from "@/features/procurements/purchase-orders/schemas";
import type { PurchaseOrderListMeta } from "@/features/procurements/purchase-orders/client";
import type {
  PurchaseOrderCatalogItem,
  PurchaseOrderListItem,
  PurchaseOrderStatus,
  PurchaseOrderSupplierOption,
} from "@/features/procurements/purchase-orders/types";
import { AppError } from "@/lib/utils/errors";
import type { PurchaseOrderCreateDialogProps, PurchaseOrderFormValues } from "./forms";
import type {
  PurchaseOrderDeleteDialogProps,
  PurchaseOrderDetailDialogProps,
} from "./dialogs";

export type PurchaseOrdersTableFilters = PaginationFilters & {
  status: "all" | "draft" | "pending" | "complete";
  search: string;
  supplierId: string | "all";
  issuedFrom: string | null;
  issuedTo: string | null;
};

export type UsePurchaseOrdersTableControllerArgs = {
  initialPurchaseOrders: PurchaseOrderListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: string;
      search: string | null;
      supplierId: string | null;
      issuedFrom: string | null;
      issuedTo: string | null;
    };
  };
  suppliers: PurchaseOrderSupplierOption[];
  catalogItems: PurchaseOrderCatalogItem[];
  canManage: boolean;
};

export type PurchaseOrderCreateDialogController = {
  dialogProps: PurchaseOrderCreateDialogProps;
  openDialog: (defaults?: { supplierId?: string }) => void;
};

export type UsePurchaseOrdersTableResult = {
  columns: ReturnType<typeof createPurchaseOrderColumns>;
  initialFilters: PurchaseOrdersTableFilters;
  initialData: DataTableQueryResult<PurchaseOrderListItem>;
  queryHook: DataTableQueryHook<PurchaseOrderListItem, PurchaseOrdersTableFilters>;
  getRowId: (row: PurchaseOrderListItem) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<PurchaseOrderListItem, PurchaseOrdersTableFilters>,
  ) => DataTableToolbarProps;
  createDialogProps?: PurchaseOrderCreateDialogProps;
  detailDialogProps: PurchaseOrderDetailDialogProps;
  deleteDialogProps: PurchaseOrderDeleteDialogProps;
};

const STATUS_FILTER_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Complete", value: "complete" },
];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

export function usePurchaseOrderCreateDialogController({
  suppliers,
  catalogItems,
}: {
  suppliers: PurchaseOrderSupplierOption[];
  catalogItems: PurchaseOrderCatalogItem[];
}): PurchaseOrderCreateDialogController {
  const createPurchaseOrderMutation = useCreatePurchaseOrderMutation();
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    supplierId?: string;
    version: number;
  }>({ open: false, supplierId: undefined, version: 0 });

  const catalogMap = React.useMemo(
    () => new Map(catalogItems.map((item) => [item.id, item])),
    [catalogItems],
  );

  const mapFormValues = React.useCallback(
    (values: PurchaseOrderFormValues) => {
      if (!values.supplierId) {
        throw new AppError(400, "Pilih supplier terlebih dahulu");
      }

      const items: PurchaseOrderItemPayload[] = [];
      for (const item of values.items) {
        const catalog = catalogMap.get(item.catalogItemId);
        if (!catalog) continue;
        const qty = Number(item.qty);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        items.push({
          catalogItemId: catalog.id,
          qty: Math.round(qty),
          price: catalog.purchase_price ?? 0,
        });
      }

      if (items.length === 0) {
        throw new AppError(400, "Tambahkan minimal satu item katalog");
      }

      const totals = {
        grand_total: items.reduce(
          (sum, entry) => sum + (entry.price ?? 0) * entry.qty,
          0,
        ),
      };

      return createPurchaseOrderSchema.parse({
        supplierId: values.supplierId,
        status: values.status,
        items,
        totals,
      });
    },
    [catalogMap],
  );

  const handleSubmit = React.useCallback(
    async (values: PurchaseOrderFormValues) => {
      try {
        const payload = mapFormValues(values);
        await createPurchaseOrderMutation.mutateAsync(payload);
        toast.success("Purchase order dibuat");
        setDialogState((prev) => ({ ...prev, open: false }));
      } catch (error) {
        toast.error(getErrorMessage(error, "Gagal membuat purchase order"));
      }
    },
    [createPurchaseOrderMutation, mapFormValues],
  );

  const openDialog = React.useCallback(
    (defaults?: { supplierId?: string }) => {
      setDialogState((prev) => ({
        open: true,
        supplierId: defaults?.supplierId ?? prev.supplierId,
        version: prev.version + 1,
      }));
    },
    [],
  );

  const dialogProps: PurchaseOrderCreateDialogProps = React.useMemo(
    () => ({
      open: dialogState.open,
      onOpenChange: (open) =>
        setDialogState((prev) => ({
          ...prev,
          open,
        })),
      onSubmit: handleSubmit,
      isSubmitting: createPurchaseOrderMutation.isPending,
      suppliers,
      catalogItems,
      prefill: {
        supplierId: dialogState.supplierId,
        version: dialogState.version,
      },
    }),
    [
      catalogItems,
      createPurchaseOrderMutation.isPending,
      handleSubmit,
      dialogState.open,
      dialogState.supplierId,
      dialogState.version,
      suppliers,
    ],
  );

  return {
    dialogProps,
    openDialog,
  };
}

export function usePurchaseOrdersTableController({
  initialPurchaseOrders,
  initialMeta,
  suppliers,
  catalogItems,
  canManage,
}: UsePurchaseOrdersTableControllerArgs): UsePurchaseOrdersTableResult {
  const initialFilters = React.useMemo<PurchaseOrdersTableFilters>(
    () => ({
      page: initialMeta.pagination.page,
      pageSize: initialMeta.pagination.pageSize,
      status:
        (initialMeta.filters.status as PurchaseOrdersTableFilters["status"]) ??
        "all",
      search: initialMeta.filters.search ?? "",
      supplierId: initialMeta.filters.supplierId ?? "all",
      issuedFrom: initialMeta.filters.issuedFrom ?? null,
      issuedTo: initialMeta.filters.issuedTo ?? null,
    }),
    [initialMeta],
  );

  const createDialogController = usePurchaseOrderCreateDialogController({
    suppliers,
    catalogItems,
  });
  const { dialogProps, openDialog } = createDialogController;

  const [selectedOrder, setSelectedOrder] = React.useState<PurchaseOrderListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PurchaseOrderListItem | null>(
    null,
  );
  const [pendingStatus, setPendingStatus] = React.useState<
    Record<string, PurchaseOrderStatus>
  >({});
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  const columns = React.useMemo(
    () =>
      createPurchaseOrderColumns(
        canManage
          ? {
              onView: setSelectedOrder,
              onDelete: (order) => setDeleteTarget(order),
              isRowPending: (row) => pendingDeleteId === row.id,
              disableDelete: (row) => row.status === "complete",
            }
          : {
              onView: setSelectedOrder,
            },
      ),
    [canManage, pendingDeleteId],
  );

  const queryHook = usePurchaseOrdersDataTableQuery;

  usePurchaseOrdersRealtime(true);

  const updatePurchaseOrderMutation = useUpdatePurchaseOrderMutation();
  const deletePurchaseOrderMutation = useDeletePurchaseOrderMutation();

  const handleStatusChange = React.useCallback(
    async (order: PurchaseOrderListItem, nextStatus: PurchaseOrderStatus) => {
      if (order.status === nextStatus) return;
      setPendingStatus((prev) => ({ ...prev, [order.id]: nextStatus }));
      try {
        const payload = updatePurchaseOrderSchema.parse({ status: nextStatus });
        await updatePurchaseOrderMutation.mutateAsync({
          purchaseOrderId: order.id,
          payload,
        });
        toast.success("Status purchase order diperbarui");
      } catch (error) {
        toast.error(getErrorMessage(error, "Gagal memperbarui status"));
      } finally {
        setPendingStatus((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
      }
    },
    [updatePurchaseOrderMutation],
  );

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setPendingDeleteId(targetId);
    try {
      await deletePurchaseOrderMutation.mutateAsync(targetId);
      toast.success("Purchase order dihapus");
      setDeleteTarget(null);
      setSelectedOrder((current) =>
        current?.id === targetId ? null : current,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal menghapus purchase order"));
    } finally {
      setPendingDeleteId(null);
    }
  }, [deletePurchaseOrderMutation, deleteTarget]);

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<
        PurchaseOrderListItem,
        PurchaseOrdersTableFilters
      >,
    ): DataTableToolbarProps => {
      const showReset =
        context.filters.search.trim().length > 0 ||
        context.filters.status !== "all";

      return {
        search: {
          value: context.filters.search,
          onChange: (value) => context.updateFilters({ search: value }),
          placeholder: "Search PO ID",
          disabled: context.isSyncing,
        },
        filters: [
          {
            type: "select",
            id: "status-filter",
            value: context.filters.status,
            onValueChange: (value) =>
              context.updateFilters({
                status: (value ??
                  "all") as PurchaseOrdersTableFilters["status"],
              }),
            options: STATUS_FILTER_OPTIONS,
            placeholder: "Status",
            disabled: context.isSyncing,
          },
        ],
        reset: {
          visible: showReset,
          onReset: () =>
            context.updateFilters(
              () => ({
                ...context.filters,
                search: "",
                status: "all",
                supplierId: "all",
                issuedFrom: null,
                issuedTo: null,
              }),
              { resetPage: true },
            ),
          disabled: context.isSyncing,
        },
        status: {
          isSyncing: context.isSyncing,
        },
        primaryAction: canManage ? (
          <Button onClick={() => openDialog()}>
            <IconPlus className="mr-2 size-4" />
            Purchase Order
          </Button>
        ) : undefined,
      };
    },
    [canManage, openDialog],
  );

  const detailDialogProps: PurchaseOrderDetailDialogProps = {
    order: selectedOrder,
    onClose: () => setSelectedOrder(null),
    catalogItems,
    canManage,
    onStatusChange: (nextStatus) => {
      if (!selectedOrder) return;
      void handleStatusChange(selectedOrder, nextStatus);
    },
    pendingStatus: selectedOrder
      ? pendingStatus[selectedOrder.id] ?? null
      : null,
    onDelete:
      canManage && selectedOrder
        ? () => setDeleteTarget(selectedOrder)
        : undefined,
    isDeleting: selectedOrder
      ? pendingDeleteId === selectedOrder.id
      : false,
  };

  const deleteDialogProps: PurchaseOrderDeleteDialogProps = {
    order: deleteTarget,
    onCancel: () => setDeleteTarget(null),
    onConfirm: () => {
      void handleDeleteConfirm();
    },
    isPending: pendingDeleteId !== null,
  };

  return {
    columns,
    initialFilters,
    initialData: {
      items: initialPurchaseOrders,
      meta: initialMeta,
    },
    queryHook,
    getRowId: (row) => row.id,
    buildToolbarConfig,
    createDialogProps: canManage ? dialogProps : undefined,
    detailDialogProps,
    deleteDialogProps,
  };
}

export function usePurchaseOrdersDataTableQuery(
  filters: PurchaseOrdersTableFilters,
  options?: { initialData?: DataTableQueryResult<PurchaseOrderListItem> },
) {
  const queryFilters: PurchaseOrderFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
    ...(filters.search.trim().length > 0
      ? { search: filters.search.trim() }
      : {}),
    ...(filters.supplierId !== "all" && filters.supplierId
      ? { supplierId: filters.supplierId }
      : {}),
    ...(filters.issuedFrom ? { issuedFrom: filters.issuedFrom } : {}),
    ...(filters.issuedTo ? { issuedTo: filters.issuedTo } : {}),
  };

  const hookOptions = options?.initialData
    ? {
        initialData: {
          items: options.initialData.items,
          meta: (options.initialData.meta ?? null) as PurchaseOrderListMeta | null,
        },
      }
    : undefined;

  return usePurchaseOrders(queryFilters, hookOptions);
}
