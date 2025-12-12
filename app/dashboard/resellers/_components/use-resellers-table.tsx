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
import { createResellerColumns } from "../columns";
import { Button } from "@/components/ui/button";
import type {
  InviteResellerFormValues,
  EditResellerFormValues,
} from "./forms";
import type { ResellerListItem } from "@/features/resellers/types";
import type { ResellerFilters } from "@/features/resellers/schemas";
import type { ResellerListMeta } from "@/features/resellers/client";
import {
  useResellers,
  useCreateResellerMutation,
  useUpdateResellerMutation,
  useToggleResellerStatusMutation,
  useDeleteResellerMutation,
} from "@/features/resellers/hooks";
import { DataTableToolbarProps } from "@/components/tables/data-table-toolbar";
import { useDataTableState } from "@/components/tables/use-data-table-state";

export type ResellersTableFilters = PaginationFilters & {
  search: string;
  status: "all" | "active" | "inactive";
};

export type UseResellersTableControllerArgs = {
  initialResellers: ResellerListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { search: string | null; status: "all" | "active" | "inactive" };
  };
  canManage: boolean;
};

type ToggleDialogState = {
  reseller: ResellerListItem;
  nextStatus: boolean;
} | null;

type UseResellersTableControllerResult = {
  columns: ColumnDef<ResellerListItem, unknown>[];
  initialFilters: ResellersTableFilters;
  initialData: DataTableQueryResult<ResellerListItem>;
  queryHook: DataTableQueryHook<ResellerListItem, ResellersTableFilters>;
  getRowId: (row: ResellerListItem) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<ResellerListItem, ResellersTableFilters>,
  ) => DataTableToolbarProps;
  inviteSheetProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: InviteResellerFormValues) => Promise<void>;
    isSubmitting: boolean;
  };
  editSheetProps: {
    reseller: ResellerListItem | null;
    onOpenChange: (reseller: ResellerListItem | null) => void;
    onSubmit: (values: EditResellerFormValues) => Promise<void>;
    isSubmitting: boolean;
  };
  dialogs: {
    toggle: {
      dialog: ToggleDialogState;
      onConfirm: () => void;
      onCancel: () => void;
    };
    delete: {
      dialog: ResellerListItem | null;
      onConfirm: () => void;
      onCancel: () => void;
    };
    bulkDelete: {
      dialog: ResellerListItem[] | null;
      onConfirm: () => void;
      onCancel: () => void;
      isPending: boolean;
    };
  };
};

function normalizeContact(
  values: Pick<
    InviteResellerFormValues,
    "email" | "phone" | "address" | "note"
  >,
) {
  const contact: Record<string, string> = {};
  if (values.email.trim()) contact.email = values.email.trim();
  if (values.phone.trim()) contact.phone = values.phone.trim();
  if (values.address.trim()) contact.address = values.address.trim();
  if (values.note.trim()) contact.note = values.note.trim();
  return Object.keys(contact).length ? contact : undefined;
}

export function useResellersTableController({
  initialResellers,
  initialMeta,
  canManage,
}: UseResellersTableControllerArgs): UseResellersTableControllerResult {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editingReseller, setEditingReseller] =
    React.useState<ResellerListItem | null>(null);
  const [pendingActions, setPendingActions] = React.useState<
    Record<string, "toggle" | "delete" | "update">
  >({});
  const [toggleDialog, setToggleDialog] =
    React.useState<ToggleDialogState>(null);
  const [deleteDialog, setDeleteDialog] =
    React.useState<ResellerListItem | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = React.useState<
    ResellerListItem[] | null
  >(null);
  const [bulkActionState, setBulkActionState] = React.useState<{
    type: "activate" | "deactivate" | "delete" | null;
    running: boolean;
  }>({ type: null, running: false });

  const initialFilters: ResellersTableFilters = React.useMemo(
    () => ({
      page: initialMeta.pagination.page,
      pageSize: initialMeta.pagination.pageSize,
      search: initialMeta.filters.search ?? "",
      status: initialMeta.filters.status ?? "all",
    }),
    [initialMeta],
  );

  const columns = React.useMemo<ColumnDef<ResellerListItem>[]>(
    () =>
      createResellerColumns({
        canManage,
        pendingActions,
        onEdit: (reseller) => {
          if (!canManage) return;
          setEditingReseller(reseller);
        },
        onToggleStatus: (reseller) => {
          if (!canManage) return;
          setToggleDialog({ reseller, nextStatus: !reseller.is_active });
        },
        onDelete: (reseller) => {
          if (!canManage) return;
          setDeleteDialog(reseller);
        },
      }),
    [canManage, pendingActions],
  );

  const queryHook = useResellersDataTableQuery;

  const controller = useDataTableState<ResellerListItem, ResellersTableFilters>(
    {
      columns,
      initialFilters,
      queryHook,
      initialData: {
        items: initialResellers,
        meta: initialMeta,
      },
      getRowId: (row) => row.id,
    },
  );



  const createMutation = useCreateResellerMutation();
  const updateMutation = useUpdateResellerMutation();
  const toggleStatusMutation = useToggleResellerStatusMutation();
  const deleteMutation = useDeleteResellerMutation();

  const mutationBusy =
    controller.queryResult.isFetching ||
    createMutation.isPending ||
    updateMutation.isPending ||
    toggleStatusMutation.isPending ||
    deleteMutation.isPending ||
    bulkActionState.running;

  const handleInviteSubmit = React.useCallback(
    async (values: InviteResellerFormValues) => {
      try {
        await createMutation.mutateAsync({
          name: values.name.trim(),
          contact: normalizeContact(values),
          isActive: true,
        });
        toast.success("Reseller created");
        setInviteOpen(false);
        await controller.queryResult.refetch();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create reseller",
        );
      }
    },
    [controller.queryResult, createMutation],
  );

  const handleEditSubmit = React.useCallback(
    async (values: EditResellerFormValues) => {
      if (!editingReseller) return;
      if (pendingActions[editingReseller.id]) return;

      const payload: Record<string, unknown> = {};
      const trimmedName = values.name.trim();
      if (trimmedName && trimmedName !== editingReseller.name) {
        payload.name = trimmedName;
      }
      const contact = normalizeContact({
        email: values.email,
        phone: values.phone,
        address: values.address,
        note: values.note,
      });
      if (contact) {
        payload.contact = contact;
      }
      if (values.isActive !== editingReseller.is_active) {
        payload.isActive = values.isActive;
      }

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        return;
      }

      setPendingActions((prev) => ({
        ...prev,
        [editingReseller.id]: "update",
      }));
      try {
        await updateMutation.mutateAsync({
          resellerId: editingReseller.id,
          input: payload,
        });
        toast.success("Reseller updated");
        setEditingReseller(null);
        await controller.queryResult.refetch();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update reseller",
        );
      } finally {
        setPendingActions((prev) => {
          const rest = { ...prev };
          delete rest[editingReseller.id];
          return rest;
        });
      }
    },
    [controller.queryResult, editingReseller, pendingActions, updateMutation],
  );

  const performToggleStatus = React.useCallback(
    async (reseller: ResellerListItem, nextStatus: boolean) => {
      if (pendingActions[reseller.id]) return;
      setPendingActions((prev) => ({ ...prev, [reseller.id]: "toggle" }));
      try {
        await toggleStatusMutation.mutateAsync({
          resellerId: reseller.id,
          isActive: nextStatus,
        });
        toast.success(`Reseller ${nextStatus ? "activated" : "deactivated"}`);
        await controller.queryResult.refetch();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update status",
        );
      } finally {
        setPendingActions((prev) => {
          const rest = { ...prev };
          delete rest[reseller.id];
          return rest;
        });
      }
    },
    [controller.queryResult, pendingActions, toggleStatusMutation],
  );

  const performDelete = React.useCallback(
    async (reseller: ResellerListItem) => {
      if (pendingActions[reseller.id]) return;
      setPendingActions((prev) => ({ ...prev, [reseller.id]: "delete" }));
      try {
        await deleteMutation.mutateAsync(reseller.id);
        toast.success("Reseller deleted");
        await controller.queryResult.refetch();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete reseller",
        );
      } finally {
        setPendingActions((prev) => {
          const rest = { ...prev };
          delete rest[reseller.id];
          return rest;
        });
      }
    },
    [controller.queryResult, deleteMutation, pendingActions],
  );

  const executeBulkAction = React.useCallback(
    async (
      action: "activate" | "deactivate" | "delete",
      targets: ResellerListItem[],
    ) => {
      if (targets.length === 0) return;
      setBulkActionState({ type: action, running: true });

      try {
        for (const reseller of targets) {
          if (action === "delete") {
            await deleteMutation.mutateAsync(reseller.id);
          } else {
            await toggleStatusMutation.mutateAsync({
              resellerId: reseller.id,
              isActive: action === "activate",
            });
          }
        }
        toast.success(
          action === "delete"
            ? `${targets.length} reseller(s) deleted.`
            : `${targets.length} reseller(s) ${action}d.`,
        );
        await controller.queryResult.refetch();
        controller.clearRowSelection();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Bulk action failed",
        );
      } finally {
        setBulkActionState({ type: null, running: false });
      }
    },
    [controller, deleteMutation, toggleStatusMutation],
  );

  const handleBulkAction = React.useCallback(
    (
      action: "activate" | "deactivate" | "delete",
      selected: ResellerListItem[],
    ) => {
      if (!canManage) return;
      if (selected.length < 2 && action !== "delete") {
        toast.info("Select at least 2 resellers to run bulk actions.");
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
    await performToggleStatus(toggleDialog.reseller, toggleDialog.nextStatus);
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
      context: DataTableRenderContext<ResellerListItem, ResellersTableFilters>,
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
              context.updateFilters({
                status: value as ResellersTableFilters["status"],
              }),
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
            <span className="hidden lg:inline">Add Reseller</span>
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
                    onSelect: () =>
                      handleBulkAction("activate", context.selectedRows),
                  },
                  {
                    id: "bulk-deactivate",
                    label: "Deactivate",
                    onSelect: () =>
                      handleBulkAction("deactivate", context.selectedRows),
                  },
                  {
                    id: "bulk-delete",
                    label: "Delete",
                    destructive: true,
                    onSelect: () =>
                      handleBulkAction("delete", context.selectedRows),
                  },
                ],
              }
            : undefined,
      };
    },
    [
      bulkActionState.running,
      canManage,
      handleBulkAction,
      initialFilters,
      mutationBusy,
    ],
  );

  return {
    columns,
    initialFilters,
    initialData: {
      items: initialResellers,
      meta: initialMeta,
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
      reseller: editingReseller,
      onOpenChange: setEditingReseller,
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

export function useResellersDataTableQuery(
  filters: ResellersTableFilters,
  options?: { initialData?: DataTableQueryResult<ResellerListItem> },
) {
  const queryFilters: ResellerFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
    ...(filters.search.trim().length > 0
      ? { search: filters.search.trim() }
      : {}),
  };

  const hookOptions = options?.initialData
    ? {
        initialData: {
          items: options.initialData.items,
          meta: options.initialData.meta as ResellerListMeta | null,
        },
      }
    : undefined;

  return useResellers(queryFilters, hookOptions);
}
