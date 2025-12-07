"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import type { DataTableRenderContext } from "@/components/tables/data-table";
import {
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
} from "@/components/tables/use-data-table-state";
import { DataTableToolbarProps } from "@/components/tables/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createActionColumn } from "@/components/tables/create-action-column";
import {
  useSupplierCatalogList,
  useDeleteCatalogItemMutation,
  useToggleCatalogItemMutation,
} from "@/features/procurements/suppliers/hooks";
import type {
  SupplierCatalogFilters,
} from "@/features/procurements/suppliers/schemas";
import type {
  StoreIngredientOption,
  SupplierCatalogWithLinks,
} from "@/features/procurements/suppliers/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { toast } from "sonner";

export type SupplierCatalogTableFilters = PaginationFilters & {
  status: "all" | "active" | "inactive";
  search: string;
};

export type UseSupplierCatalogTableArgs = {
  supplierId: string;
  storeIngredients: StoreIngredientOption[];
  canManage: boolean;
  initialData: DataTableQueryResult<SupplierCatalogWithLinks>;
};

export type UseSupplierCatalogTableResult = {
  columns: ColumnDef<SupplierCatalogWithLinks>[];
  initialFilters: SupplierCatalogTableFilters;
  initialData: DataTableQueryResult<SupplierCatalogWithLinks>;
  queryHook: DataTableQueryHook<SupplierCatalogWithLinks, SupplierCatalogTableFilters>;
  getRowId: (row: SupplierCatalogWithLinks) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<SupplierCatalogWithLinks, SupplierCatalogTableFilters>,
  ) => DataTableToolbarProps;
  createDialogProps?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
  editDialogProps?: {
    supplierId: string;
    item: SupplierCatalogWithLinks;
    storeIngredients: StoreIngredientOption[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
  deleteDialogProps?: {
    item: SupplierCatalogWithLinks | null;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
  };
};

const STATUS_FILTER_OPTIONS = [
  { label: "Semua status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

function createColumns({
  canManage,
  onEdit,
  onToggle,
  onDelete,
  pendingActions,
}: {
  canManage: boolean;
  onEdit: (item: SupplierCatalogWithLinks) => void;
  onToggle: (item: SupplierCatalogWithLinks) => void;
  onDelete: (item: SupplierCatalogWithLinks) => void;
  pendingActions: Record<string, "toggle" | "delete">;
}): ColumnDef<SupplierCatalogWithLinks>[] {
  const baseColumns: ColumnDef<SupplierCatalogWithLinks>[] = [
    {
      accessorKey: "name",
      header: "Item",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{row.original.name}</span>
          <Badge
            className="w-fit text-xs"
            variant={row.original.is_active ? "secondary" : "destructive"}
          >
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "purchase_price",
      header: "Harga",
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.original.purchase_price / 100)}
        </span>
      ),
    },
    {
      accessorKey: "base_uom",
      header: "Base UOM",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground uppercase">
          {row.original.base_uom}
        </span>
      ),
    },
    {
      id: "linked",
      header: "Linked Ingredients",
      cell: ({ row }) => {
        const links = row.original.links ?? [];
        const count = links.length;
        const preferred = links.find((link) => link.preferred);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm text-foreground">
              {count} linked ingredient{count === 1 ? "" : "s"}
            </span>
            {preferred ? (
              <span className="text-xs text-muted-foreground">
                Preferred: {preferred.ingredientName}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "unit_label",
      header: "Unit Beli",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.unit_label || row.original.base_uom}
        </span>
      ),
    },
    {
      accessorKey: "conversion_rate",
      header: "Konversi",
      cell: ({ row }) => (
        <div className="flex flex-col text-sm text-muted-foreground">
          <span>
            1 {row.original.unit_label || "Unit"} = {row.original.conversion_rate}{" "}
            {row.original.base_uom}
          </span>
         </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
  ];

  if (!canManage) {
    return baseColumns;
  }

  const actionColumn = createActionColumn<SupplierCatalogWithLinks>({
    getIsRowPending: (row) => Boolean(pendingActions[row.id]),
    actions: [
      {
        label: "Edit item",
        onSelect: onEdit,
      },
      {
        label: (row) => (row.is_active ? "Deactivate" : "Activate"),
        onSelect: onToggle,
        isPending: (row) => pendingActions[row.id] === "toggle",
      },
      {
        type: "separator",
      },
      {
        label: "Delete",
        destructive: true,
        onSelect: onDelete,
        isPending: (row) => pendingActions[row.id] === "delete",
      },
    ],
  });

  return [...baseColumns, actionColumn];
}

function createCatalogQueryHook(
  supplierId: string,
): DataTableQueryHook<SupplierCatalogWithLinks, SupplierCatalogTableFilters> {
  return (filters, options) => {
    const queryFilters: SupplierCatalogFilters = {
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      ...(filters.search.trim().length > 0
        ? { search: filters.search.trim() }
        : {}),
    };

    return useSupplierCatalogList(supplierId, queryFilters, {
      initialData: options?.initialData,
    });
  };
}

export function useSupplierCatalogTableController({
  supplierId,
  storeIngredients,
  canManage,
  initialData,
}: UseSupplierCatalogTableArgs): UseSupplierCatalogTableResult {
  const queryHook = React.useMemo(
    () => createCatalogQueryHook(supplierId),
    [supplierId],
  );

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<SupplierCatalogWithLinks | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<SupplierCatalogWithLinks | null>(null);
  const [pendingActions, setPendingActions] = React.useState<Record<string, "toggle" | "delete">>({});

  const toggleMutation = useToggleCatalogItemMutation(supplierId);
  const deleteMutation = useDeleteCatalogItemMutation(supplierId);

  const initialFilters: SupplierCatalogTableFilters = React.useMemo(() => {
    const pagination = (initialData.meta?.pagination ?? {}) as {
      page?: number;
      pageSize?: number;
      total?: number;
    };
    const filters = (initialData.meta?.filters ?? {}) as Partial<SupplierCatalogTableFilters>;
    return {
      page: pagination.page ?? 1,
      pageSize: pagination.pageSize ?? Math.max(initialData.items.length, 8),
      status: filters.status ?? "all",
      search: filters.search ?? "",
    };
  }, [initialData]);

  const handleToggleStatus = React.useCallback(
    async (item: SupplierCatalogWithLinks) => {
      setPendingActions((prev) => ({ ...prev, [item.id]: "toggle" }));
      try {
        await toggleMutation.mutateAsync({
          catalogItemId: item.id,
          isActive: !item.is_active,
        });
        toast.success(
          `Item ${item.is_active ? "deactivated" : "activated"}`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update status";
        toast.error(message);
      } finally {
        setPendingActions((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }
    },
    [toggleMutation],
  );

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!deleteItem) return;
    setPendingActions((prev) => ({ ...prev, [deleteItem.id]: "delete" }));
    try {
      await deleteMutation.mutateAsync(deleteItem.id);
      toast.success("Catalog item deleted");
      setDeleteItem(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete item";
      toast.error(message);
    } finally {
      setPendingActions((prev) => {
        const next = { ...prev };
        if (deleteItem) {
          delete next[deleteItem.id];
        }
        return next;
      });
    }
  }, [deleteItem, deleteMutation]);

  const columns = React.useMemo(
    () =>
      createColumns({
        canManage,
        onEdit: setEditingItem,
        onToggle: handleToggleStatus,
        onDelete: setDeleteItem,
        pendingActions,
      }),
    [canManage, handleToggleStatus, pendingActions],
  );

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<
        SupplierCatalogWithLinks,
        SupplierCatalogTableFilters
      >,
    ): DataTableToolbarProps => {
      const showReset =
        context.filters.search.trim().length > 0 ||
        context.filters.status !== "all";

      return {
        search: {
          value: context.filters.search,
          onChange: (value) => context.updateFilters({ search: value }),
          placeholder: "Cari item katalog",
          disabled: context.isSyncing,
        },
        filters: [
          {
            type: "select",
            id: "status",
            value: context.filters.status,
            onValueChange: (value) =>
              context.updateFilters({
                status: (value ?? "all") as SupplierCatalogTableFilters["status"],
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
              }),
              { resetPage: true },
            ),
          disabled: context.isSyncing,
        },
        status: {
          isSyncing: context.isSyncing,
        },
        primaryAction: canManage ? (
          <Button onClick={() => setCreateOpen(true)} disabled={context.isSyncing}>
            Add Item
          </Button>
        ) : undefined,
      };
    },
    [canManage],
  );

  return {
    columns,
    initialFilters,
    initialData,
    queryHook,
    getRowId: (row) => row.id,
    buildToolbarConfig,
    createDialogProps: canManage
      ? {
          open: createOpen,
          onOpenChange: setCreateOpen,
        }
      : undefined,
    editDialogProps: editingItem
      ? {
          supplierId,
          item: editingItem,
          storeIngredients,
          open: true,
          onOpenChange: (open: boolean) => {
            if (!open) {
              setEditingItem(null);
            }
          },
        }
      : undefined,
    deleteDialogProps: canManage
      ? {
          item: deleteItem,
          isPending: deleteMutation.isPending,
          onConfirm: handleDeleteConfirm,
          onClose: () => setDeleteItem(null),
        }
      : undefined,
  };
}
