"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import type { DataTableRenderContext } from "@/components/tables/data-table";
import {
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
} from "@/components/tables/use-data-table-state";
import { useDataTableState } from "@/components/tables/use-data-table-state";
import { DataTableToolbarProps } from "@/components/tables/data-table-toolbar";
import { Button } from "@/components/ui/button";

import { createSupplierColumns } from "../columns";
import type { SupplierFormValues, SupplierEditFormValues } from "./forms";
import type { SupplierListItem } from "@/features/procurements/suppliers/types";
import type { SupplierFilters } from "@/features/procurements/suppliers/schemas";
import {
  useSuppliers,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from "@/features/procurements/suppliers/hooks";
import type { SupplierListResult } from "@/features/procurements/suppliers/client";

export type SuppliersTableFilters = PaginationFilters & {
  search: string;
  status: "all" | "active" | "inactive";
};

export type UseSuppliersTableControllerArgs = {
  initialSuppliers: SupplierListItem[];
  initialMeta: SupplierListResult["meta"];
  canManage: boolean;
};

type UseSuppliersTableControllerResult = {
  columns: ColumnDef<SupplierListItem>[];
  initialFilters: SuppliersTableFilters;
  initialData: DataTableQueryResult<SupplierListItem>;
  queryHook: DataTableQueryHook<SupplierListItem, SuppliersTableFilters>;
  getRowId: (row: SupplierListItem) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<SupplierListItem, SuppliersTableFilters>,
  ) => DataTableToolbarProps;
  inviteSheetProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: SupplierFormValues) => Promise<void>;
    isSubmitting: boolean;
  };
  editSheetProps: {
    supplier: SupplierListItem | null;
    onOpenChange: (supplier: SupplierListItem | null) => void;
    onSubmit: (values: SupplierEditFormValues) => Promise<void>;
    isSubmitting: boolean;
  };
  dialogs: {
    toggle: {
      dialog: ToggleDialogState;
      onConfirm: () => void;
      onCancel: () => void;
    };
    delete: {
      dialog: SupplierListItem | null;
      onConfirm: () => void;
      onCancel: () => void;
    };
    bulkDelete: {
      dialog: SupplierListItem[] | null;
      onConfirm: () => void;
      onCancel: () => void;
      isPending: boolean;
    };
  };
};

type ToggleDialogState = {
  supplier: SupplierListItem;
  nextStatus: boolean;
} | null;

const normalizeContact = (values: SupplierFormValues) => {
  const contact: Record<string, string> = {};
  const entries: Array<[keyof SupplierFormValues, string]> = [
    ["contactName", values.contactName],
    ["email", values.email],
    ["phone", values.phone],
    ["address", values.address],
    ["note", values.note],
  ];
  for (const [key, raw] of entries) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    contact[
      key === "contactName"
        ? "name"
        : key === "note"
          ? "note"
          : key
    ] = trimmed;
  }
  return Object.keys(contact).length ? contact : undefined;
};

export function useSuppliersTableController({
  initialSuppliers,
  initialMeta,
  canManage,
}: UseSuppliersTableControllerArgs): UseSuppliersTableControllerResult {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<SupplierListItem | null>(null);
  const [pendingActions, setPendingActions] = React.useState<Record<string, "toggle" | "delete" | "update">>({});
  const [toggleDialog, setToggleDialog] = React.useState<ToggleDialogState>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<SupplierListItem | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = React.useState<SupplierListItem[] | null>(null);
  const [bulkActionState, setBulkActionState] = React.useState<{ type: "activate" | "deactivate" | "delete" | null; running: boolean }>({ type: null, running: false });

  const initialFilters: SuppliersTableFilters = React.useMemo(
    () => ({
      page: initialMeta?.pagination?.page ?? 1,
      pageSize: initialMeta?.pagination?.pageSize ?? 50,
      search: (initialMeta?.filters?.search as string | null) ?? "",
      status: (initialMeta?.filters?.status as SuppliersTableFilters["status"]) ?? "all",
    }),
    [initialMeta],
  );

  const columns = React.useMemo<ColumnDef<SupplierListItem>[]>(
    () =>
      createSupplierColumns({
        canManage,
        pendingActions,
        onEdit: setEditingSupplier,
        onToggleStatus: (supplier) =>
          setToggleDialog({ supplier, nextStatus: !supplier.is_active }),
        onDelete: setDeleteDialog,
      }),
    [canManage, pendingActions],
  );

  const queryHook = useSuppliersDataTableQuery;

  const tableState = useDataTableState<SupplierListItem, SuppliersTableFilters>({
    columns,
    initialFilters,
    queryHook,
    initialData: {
      items: initialSuppliers,
      meta: initialMeta ?? undefined,
    },
    getRowId: (row) => row.id,
  });



  const createMutation = useCreateSupplierMutation();
  const updateMutation = useUpdateSupplierMutation();
  const deleteMutation = useDeleteSupplierMutation();

  const mutationBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkActionState.running ||
    tableState.isSyncing;

  const refresh = React.useCallback(async () => {
    await tableState.queryResult.refetch();
  }, [tableState.queryResult]);

  const handleInviteSubmit = React.useCallback(
    async (values: SupplierFormValues) => {
      try {
        await createMutation.mutateAsync({
          name: values.name.trim(),
          contact: normalizeContact(values),
          isActive: true,
        });
        toast.success("Supplier created");
        setInviteOpen(false);
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create supplier");
      }
    },
    [createMutation, refresh],
  );

  const handleEditSubmit = React.useCallback(
    async (values: SupplierEditFormValues) => {
      if (!editingSupplier) return;
      if (pendingActions[editingSupplier.id]) return;

      setPendingActions((prev) => ({ ...prev, [editingSupplier.id]: "update" }));
      try {
        await updateMutation.mutateAsync({
          supplierId: editingSupplier.id,
          payload: {
            name: values.name.trim(),
            contact: normalizeContact(values),
            isActive: values.isActive,
          },
        });
        toast.success("Supplier updated");
        setEditingSupplier(null);
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update supplier");
      } finally {
        setPendingActions((prev) => {
          const rest = { ...prev };
          delete rest[editingSupplier.id];
          return rest;
        });
      }
    },
    [editingSupplier, pendingActions, refresh, updateMutation],
  );

  const performToggleStatus = React.useCallback(
    async (supplier: SupplierListItem, nextStatus: boolean) => {
      if (pendingActions[supplier.id]) return;
      setPendingActions((prev) => ({ ...prev, [supplier.id]: "toggle" }));
      try {
        await updateMutation.mutateAsync({
          supplierId: supplier.id,
          payload: { isActive: nextStatus },
        });
        toast.success(`Supplier ${nextStatus ? "activated" : "deactivated"}`);
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update status");
      } finally {
        setPendingActions((prev) => {
          const rest = { ...prev };
          delete rest[supplier.id];
          return rest;
        });
      }
    },
    [pendingActions, refresh, updateMutation],
  );

  const performDelete = React.useCallback(
    async (supplier: SupplierListItem) => {
      if (pendingActions[supplier.id]) return;
      setPendingActions((prev) => ({ ...prev, [supplier.id]: "delete" }));
      try {
        await deleteMutation.mutateAsync(supplier.id);
        toast.success("Supplier deleted");
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete supplier");
      } finally {
        setPendingActions((prev) => {
          const rest = { ...prev };
          delete rest[supplier.id];
          return rest;
        });
      }
    },
    [deleteMutation, pendingActions, refresh],
  );

  const executeBulkAction = React.useCallback(
    async (action: "activate" | "deactivate" | "delete", targets: SupplierListItem[]) => {
      if (targets.length === 0) return;
      setBulkActionState({ type: action, running: true });
      try {
        for (const supplier of targets) {
          if (action === "delete") {
            await deleteMutation.mutateAsync(supplier.id);
          } else {
            await updateMutation.mutateAsync({
              supplierId: supplier.id,
              payload: { isActive: action === "activate" },
            });
          }
        }
        toast.success(
          action === "delete"
            ? `${targets.length} supplier(s) deleted.`
            : `${targets.length} supplier(s) ${action}d.`,
        );
        await refresh();
        tableState.clearRowSelection();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Bulk action failed");
      } finally {
        setBulkActionState({ type: null, running: false });
      }
    },
    [deleteMutation, refresh, tableState, updateMutation],
  );

  const handleBulkAction = React.useCallback(
    (action: "activate" | "deactivate" | "delete", selected: SupplierListItem[]) => {
      if (!canManage) return;
      if (selected.length < 2 && action !== "delete") {
        toast.info("Select at least 2 suppliers to run bulk actions.");
        return;
      }
      if (action === "delete") {
        setBulkDeleteDialog(selected);
        return;
      }
      void executeBulkAction(action, selected);
    },
    [canManage, executeBulkAction],
  );

  const confirmToggleStatus = React.useCallback(async () => {
    if (!toggleDialog) return;
    await performToggleStatus(toggleDialog.supplier, toggleDialog.nextStatus);
    setToggleDialog(null);
  }, [performToggleStatus, toggleDialog]);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteDialog) return;
    await performDelete(deleteDialog);
    setDeleteDialog(null);
  }, [deleteDialog, performDelete]);

  const confirmBulkDelete = React.useCallback(async () => {
    if (!bulkDeleteDialog) return;
    await executeBulkAction("delete", bulkDeleteDialog);
    setBulkDeleteDialog(null);
  }, [bulkDeleteDialog, executeBulkAction]);

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<SupplierListItem, SuppliersTableFilters>,
    ): DataTableToolbarProps => {
      const isBusy = context.isInitialLoading || mutationBusy;
      const showReset =
        context.filters.search.trim().length > 0 ||
        context.filters.status !== initialFilters.status;
      const selectedCount = context.selectedRows.length;

      return {
        search: {
          value: context.filters.search,
          onChange: (value) => context.updateFilters({ search: value }),
          placeholder: "Search by name, email, or phone",
          disabled: isBusy,
        },
        filters: [
          {
            type: "select",
            id: "status-filter",
            value: context.filters.status,
            onValueChange: (value) =>
              context.updateFilters({ status: value as SuppliersTableFilters["status"] }),
            options: [
              { label: "All Status", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
            placeholder: "Status",
            disabled: isBusy,
          },
        ],
        reset: {
          onReset: () => {
            context.updateFilters(() => initialFilters);
            context.clearRowSelection();
          },
          visible: showReset,
          disabled: isBusy,
        },
        status: {
          isSyncing: context.isSyncing,
        },
        primaryAction: canManage ? (
          <Button onClick={() => setInviteOpen(true)} disabled={isBusy}>
            <span className="hidden lg:inline">Add Supplier</span>
            <span className="lg:hidden">Add</span>
          </Button>
        ) : null,
        bulkActions:
          canManage && selectedCount > 0
            ? {
                selectedCount,
                minSelection: 1,
                disabled: isBusy,
                isPending: bulkActionState.running,
                actions: [
                  {
                    id: "bulk-activate",
                    label: "Activate",
                    onSelect: () => handleBulkAction("activate", context.selectedRows),
                  },
                  {
                    id: "bulk-deactivate",
                    label: "Deactivate",
                    onSelect: () => handleBulkAction("deactivate", context.selectedRows),
                  },
                  {
                    id: "bulk-delete",
                    label: "Delete",
                    destructive: true,
                    onSelect: () => handleBulkAction("delete", context.selectedRows),
                  },
                ],
              }
            : undefined,
      };
    },
    [bulkActionState.running, canManage, handleBulkAction, initialFilters, mutationBusy],
  );

  return {
    columns,
    initialFilters,
    initialData: {
      items: initialSuppliers,
      meta: initialMeta ?? undefined,
    },
    queryHook,
    getRowId: (row) => row.id,
    buildToolbarConfig,
    inviteSheetProps: {
      open: inviteOpen,
      onOpenChange: setInviteOpen,
      onSubmit: handleInviteSubmit,
      isSubmitting: createMutation.isPending,
    },
    editSheetProps: {
      supplier: editingSupplier,
      onOpenChange: setEditingSupplier,
      onSubmit: handleEditSubmit,
      isSubmitting: updateMutation.isPending,
    },
    dialogs: {
      toggle: {
        dialog: toggleDialog,
        onConfirm: confirmToggleStatus,
        onCancel: () => setToggleDialog(null),
      },
      delete: {
        dialog: deleteDialog,
        onConfirm: confirmDelete,
        onCancel: () => setDeleteDialog(null),
      },
      bulkDelete: {
        dialog: bulkDeleteDialog,
        onConfirm: confirmBulkDelete,
        onCancel: () => setBulkDeleteDialog(null),
        isPending: bulkActionState.running,
      },
    },
  };
}

export function useSuppliersDataTableQuery(
  filters: SuppliersTableFilters,
  options?: { initialData?: DataTableQueryResult<SupplierListItem> },
) {
  const queryFilters: SupplierFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
    ...(filters.search.trim().length > 0 ? { search: filters.search.trim() } : {}),
  };

  const hookOptions = options?.initialData
    ? {
        initialData: {
          items: options.initialData.items,
          meta: (options.initialData.meta as SupplierListResult["meta"]) ?? null,
        },
      }
    : undefined;

  return useSuppliers(queryFilters, hookOptions);
}
