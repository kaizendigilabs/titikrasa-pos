'use client';

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { DataTableRenderContext } from "@/components/tables/data-table";
import {
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
} from "@/components/tables/use-data-table-state";
import { createUserColumns } from "../columns";
import {
  isManagedRole,
  type ManagedRole,
  type RoleFilter,
  type StatusFilter,
} from "../table-filters";
import type { DataTableToolbarProps } from "@/components/tables/data-table-toolbar";
import type { InviteFormState, EditFormState } from "./forms";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useResetPasswordMutation,
  useRoles,
  useToggleUserStatusMutation,
  useUpdateUserMutation,
  useUsers,
  useUsersRealtime,
} from "@/features/users/hooks";
import type { UserListItem } from "@/features/users/types";
import type { ListUsersParams } from "@/features/users/client";
import { AppError } from "@/lib/utils/errors";

import type { ToggleDialogState } from "./dialogs";

export type UsersTableFilters = PaginationFilters & {
  status: StatusFilter;
  role: RoleFilter;
  search: string;
};

export type UsersBulkActionType =
  | "activate"
  | "deactivate"
  | "reset-password"
  | "delete";

export type UseUsersTableControllerArgs = {
  initialUsers: UserListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: StatusFilter;
      role: string | null;
      search: string | null;
    };
  };
  initialRoles: Array<{ id: string; name: string }>;
  currentUserId: string;
  canManage: boolean;
};

type InviteSheetController = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: InviteFormState) => Promise<void>;
  isSubmitting: boolean;
  roles: Array<{ id: string; name: string }>;
};

type EditSheetController = {
  user: UserListItem | null;
  onOpenChange: (user: UserListItem | null) => void;
  onSubmit: (payload: EditFormState) => Promise<void>;
  isSubmitting: boolean;
  roles: Array<{ id: string; name: string }>;
};

type BulkDeleteDialogState = {
  users: UserListItem[];
  onComplete?: () => void;
} | null;

export type UsersDialogState = {
  toggle: {
    dialog: ToggleDialogState;
    onConfirm: () => void;
    onCancel: () => void;
  };
  delete: {
    dialog: UserListItem | null;
    onConfirm: () => void;
    onCancel: () => void;
  };
  bulkDelete: {
    dialog: UserListItem[] | null;
    onConfirm: () => void;
    onCancel: () => void;
    isPending: boolean;
  };
};

export type UsersTableControllerResult = {
  columns: ColumnDef<UserListItem, unknown>[];
  initialFilters: UsersTableFilters;
  initialData: DataTableQueryResult<UserListItem>;
  queryHook: DataTableQueryHook<UserListItem, UsersTableFilters>;
  getRowId: (row: UserListItem, index: number) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<UserListItem, UsersTableFilters>,
  ) => DataTableToolbarProps;
  inviteSheetProps: InviteSheetController;
  editSheetProps: EditSheetController;
  dialogs: UsersDialogState;
};

export function useUsersTableController({
  initialUsers,
  initialMeta,
  initialRoles,
  currentUserId,
  canManage,
}: UseUsersTableControllerArgs): UsersTableControllerResult {
  const queryClient = useQueryClient();
  const [isInviteOpen, setInviteOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserListItem | null>(null);
  const [pendingActions, setPendingActions] = React.useState<
    Record<string, "toggle" | "delete" | "update">
  >({});
  const [bulkActionState, setBulkActionState] = React.useState<{
    type: UsersBulkActionType | null;
    running: boolean;
  }>({ type: null, running: false });
  const [toggleDialog, setToggleDialog] = React.useState<ToggleDialogState>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<UserListItem | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] =
    React.useState<BulkDeleteDialogState>(null);

  const initialFilters = React.useMemo<UsersTableFilters>(() => {
    const normalizedRole = initialMeta.filters.role;
    return {
      page: initialMeta.pagination.page ?? 1,
      pageSize: initialMeta.pagination.pageSize ?? 50,
      status: initialMeta.filters.status ?? "all",
      role:
        normalizedRole && isManagedRole(normalizedRole)
          ? (normalizedRole as ManagedRole)
          : "all",
      search: initialMeta.filters.search ?? "",
    };
  }, [initialMeta]);

  const initialData = React.useMemo<DataTableQueryResult<UserListItem>>(
    () => ({
      items: initialUsers,
      meta: initialMeta,
    }),
    [initialMeta, initialUsers],
  );

  const rolesQuery = useRoles({ initialData: initialRoles });
  const roles = React.useMemo(
    () => (rolesQuery.data ?? initialRoles).filter((role) => isManagedRole(role.name)),
    [initialRoles, rolesQuery.data],
  );

  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const toggleUserStatusMutation = useToggleUserStatusMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  const invalidateUsers = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  }, [queryClient]);

  const handleInviteSubmit = React.useCallback(
    async (payload: InviteFormState) => {
      try {
        await createUserMutation.mutateAsync(payload);
        toast.success("User created");
        setInviteOpen(false);
        await invalidateUsers();
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to create user"));
      }
    },
    [createUserMutation, invalidateUsers],
  );

  const handleResetPassword = React.useCallback(
    async (user: UserListItem) => {
      try {
        const result = await resetPasswordMutation.mutateAsync({
          userId: user.user_id,
        });
        toast.success("Password reset link generated");
        if (result.resetLink) {
          toast.info("Share this reset link with the user", {
            description: result.resetLink,
          });
        }
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to generate reset link"));
      }
    },
    [resetPasswordMutation],
  );

  const performToggleStatus = React.useCallback(
    async (user: UserListItem, nextStatus: boolean) => {
      if (pendingActions[user.user_id]) return;
      if (user.user_id === currentUserId && !nextStatus) {
        toast.error("You cannot deactivate your own account");
        return;
      }

      setPendingActions((prev) => ({
        ...prev,
        [user.user_id]: "toggle",
      }));
      try {
        await toggleUserStatusMutation.mutateAsync({
          userId: user.user_id,
          isActive: nextStatus,
        });
        toast.success(`User ${nextStatus ? "activated" : "deactivated"}`);
        await invalidateUsers();
      } catch (error) {
        const actionLabel = nextStatus ? "activate" : "deactivate";
        toast.error(getErrorMessage(error, `Failed to ${actionLabel} user`));
      } finally {
        setPendingActions((prev) => {
          const rest = { ...prev };
          delete rest[user.user_id];
          return rest;
        });
      }
    },
    [
      currentUserId,
      invalidateUsers,
      pendingActions,
      toggleUserStatusMutation,
    ],
  );

  const performHardDelete = React.useCallback(
    async (user: UserListItem) => {
      if (pendingActions[user.user_id]) return;
      if (user.user_id === currentUserId) {
        toast.error("You cannot delete your own account");
        return;
      }

      setPendingActions((prev) => ({
        ...prev,
        [user.user_id]: "delete",
      }));
      try {
        await deleteUserMutation.mutateAsync(user.user_id);
        toast.success("User deleted");
        await invalidateUsers();
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to delete user"));
      } finally {
        setPendingActions((prev) => {
          const rest = { ...prev };
          delete rest[user.user_id];
          return rest;
        });
      }
    },
    [currentUserId, deleteUserMutation, invalidateUsers, pendingActions],
  );

  const handleUpdateSubmit = React.useCallback(
    async (payload: EditFormState) => {
      if (!editingUser) return;
      if (pendingActions[editingUser.user_id]) return;

      const targetId = editingUser.user_id;
      const previous = editingUser;
      setPendingActions((prev) => ({
        ...prev,
        [targetId]: "update",
      }));
      setEditingUser(null);

      try {
        await updateUserMutation.mutateAsync({
          userId: targetId,
          input: {
            name: payload.name,
            phone: payload.phone,
            role: payload.role,
            isActive: payload.isActive,
          },
        });
        toast.success("User updated");
        await invalidateUsers();
      } catch (error) {
        setEditingUser(previous);
        toast.error(getErrorMessage(error, "Failed to update user"));
      } finally {
        setPendingActions((prev) => {
          const rest = { ...prev };
          delete rest[targetId];
          return rest;
        });
      }
    },
    [editingUser, invalidateUsers, pendingActions, updateUserMutation],
  );

  const queryHook = useUsersDataTableQuery;

  const columns = React.useMemo<ColumnDef<UserListItem>[]>(
    () =>
      createUserColumns({
        onEdit: (user) => {
          if (!canManage) return;
          setEditingUser(user);
        },
        onToggleStatus: (user) => {
          if (!canManage) return;
          setToggleDialog({ user, nextStatus: !user.is_active });
        },
        onDelete: (user) => {
          if (!canManage) return;
          setDeleteDialog(user);
        },
        onResetPassword: (user) => {
          if (!canManage) return;
          void handleResetPassword(user);
        },
        pendingActions,
        canManage,
        currentUserId,
      }),
    [canManage, currentUserId, handleResetPassword, pendingActions],
  );

  const executeBulkAction = React.useCallback(
    async (
      action: UsersBulkActionType,
      targets: UserListItem[],
      clearSelection?: () => void,
    ) => {
      if (targets.length === 0) return;
      setBulkActionState({ type: action, running: true });

      try {
        let successCount = 0;
        const resetLinks: Array<{ user: UserListItem; link: string | null }> =
          [];

        for (const user of targets) {
          switch (action) {
            case "activate": {
              if (!user.is_active) {
                await toggleUserStatusMutation.mutateAsync({
                  userId: user.user_id,
                  isActive: true,
                });
              }
              successCount += 1;
              break;
            }
            case "deactivate": {
              if (user.is_active) {
                await toggleUserStatusMutation.mutateAsync({
                  userId: user.user_id,
                  isActive: false,
                });
              }
              successCount += 1;
              break;
            }
            case "reset-password": {
              const result = await resetPasswordMutation.mutateAsync({
                userId: user.user_id,
              });
              resetLinks.push({ user, link: result.resetLink ?? null });
              successCount += 1;
              break;
            }
            case "delete": {
              await deleteUserMutation.mutateAsync(user.user_id);
              successCount += 1;
              break;
            }
          }
        }

        await invalidateUsers();

        if (action === "activate" || action === "deactivate") {
          toast.success(
            successCount > 0
              ? `${successCount} user(s) ${
                  action === "activate" ? "activated" : "deactivated"
                }.`
              : "No users needed changes.",
          );
        } else if (action === "delete") {
          toast.success(`${successCount} user(s) deleted.`);
        } else if (action === "reset-password") {
          toast.success(`Reset links generated for ${successCount} user(s).`);
          if (resetLinks.some((entry) => entry.link)) {
            console.group("[USERS_BULK_RESET_LINKS]");
            for (const entry of resetLinks) {
              console.log(
                `${entry.user.email ?? entry.user.name ?? entry.user.user_id}: ${
                  entry.link ?? "No link returned"
                }`,
              );
            }
            console.groupEnd();
            toast.info("Reset links logged to console for manual sharing.");
          }
        }

        clearSelection?.();
      } catch (error) {
        toast.error(
          getErrorMessage(error, "Bulk action failed. Please try again."),
        );
      } finally {
        setBulkActionState({ type: null, running: false });
      }
    },
    [
      deleteUserMutation,
      invalidateUsers,
      resetPasswordMutation,
      toggleUserStatusMutation,
    ],
  );

  const handleBulkAction = React.useCallback(
    (
      action: UsersBulkActionType,
      selectedUsers: UserListItem[],
      clearSelection: () => void,
    ) => {
      if (!canManage) return;
      if (selectedUsers.length < 2) {
        toast.info("Select at least 2 users to run bulk actions.");
        return;
      }

      let actionableUsers = selectedUsers;
      if (action === "deactivate" || action === "delete") {
        actionableUsers = selectedUsers.filter(
          (user) => user.user_id !== currentUserId,
        );
      }

      if (actionableUsers.length === 0) {
        return;
      }

      if (action === "delete") {
        setBulkDeleteDialog({
          users: actionableUsers,
          onComplete: clearSelection,
        });
        return;
      }

      void executeBulkAction(action, actionableUsers, clearSelection);
    },
    [canManage, currentUserId, executeBulkAction],
  );

  const confirmToggleStatus = React.useCallback(async () => {
    if (!toggleDialog) return;
    await performToggleStatus(toggleDialog.user, toggleDialog.nextStatus);
    setToggleDialog(null);
  }, [performToggleStatus, toggleDialog]);

  const confirmHardDelete = React.useCallback(async () => {
    if (!deleteDialog) return;
    await performHardDelete(deleteDialog);
    setDeleteDialog(null);
  }, [deleteDialog, performHardDelete]);

  const confirmBulkDelete = React.useCallback(async () => {
    if (!bulkDeleteDialog) return;
    await executeBulkAction(
      "delete",
      bulkDeleteDialog.users,
      bulkDeleteDialog.onComplete,
    );
    setBulkDeleteDialog(null);
  }, [bulkDeleteDialog, executeBulkAction]);

  const mutationBusy =
    createUserMutation.isPending ||
    updateUserMutation.isPending ||
    toggleUserStatusMutation.isPending ||
    deleteUserMutation.isPending ||
    resetPasswordMutation.isPending ||
    bulkActionState.running;

  const handleInviteOpen = React.useCallback(() => {
    if (!canManage) return;
    setInviteOpen(true);
  }, [canManage]);

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<UserListItem, UsersTableFilters>,
    ): DataTableToolbarProps => {
      const isBusy = context.isInitialLoading || mutationBusy;
      const selectedCount = context.selectedRows.length;
      const trimmedSearch = context.filters.search.trim();
      const showReset =
        trimmedSearch.length > 0 ||
        context.filters.status !== initialFilters.status ||
        context.filters.role !== initialFilters.role;

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
              context.updateFilters({ status: value as StatusFilter }),
            options: [
              { label: "All Status", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
            placeholder: "Status",
            disabled: isBusy,
          },
          {
            type: "select",
            id: "role-filter",
            value: context.filters.role,
            onValueChange: (value) =>
              context.updateFilters({ role: value as RoleFilter }),
            options: [
              { label: "All Roles", value: "all" },
              { label: "Admin", value: "admin" },
              { label: "Manager", value: "manager" },
              { label: "Staff", value: "staff" },
            ],
            placeholder: "Role",
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
          "aria-label": "Reset filters",
        },
        status: {
          isSyncing: context.isSyncing,
        },
        primaryAction:
          canManage ? (
            <Button onClick={handleInviteOpen} disabled={isBusy}>
              <IconPlus className="size-4" />
              <span className="hidden lg:inline">Add User</span>
              <span className="lg:hidden">Add</span>
            </Button>
          ) : null,
        bulkActions:
          canManage && selectedCount >= 2
            ? {
                selectedCount,
                actions: [
                  {
                    id: "bulk-activate",
                    label: "Activate",
                    onSelect: () =>
                      handleBulkAction(
                        "activate",
                        context.selectedRows,
                        context.clearRowSelection,
                      ),
                  },
                  {
                    id: "bulk-deactivate",
                    label: "Deactivate",
                    onSelect: () =>
                      handleBulkAction(
                        "deactivate",
                        context.selectedRows,
                        context.clearRowSelection,
                      ),
                  },
                  {
                    id: "bulk-reset",
                    label: "Send reset link",
                    onSelect: () =>
                      handleBulkAction(
                        "reset-password",
                        context.selectedRows,
                        context.clearRowSelection,
                      ),
                  },
                  {
                    id: "bulk-delete",
                    label: "Delete",
                    destructive: true,
                    onSelect: () =>
                      handleBulkAction(
                        "delete",
                        context.selectedRows,
                        context.clearRowSelection,
                      ),
                  },
                ],
                minSelection: 2,
                disabled: isBusy,
                isPending: bulkActionState.running,
              }
            : undefined,
      };
    },
    [
      bulkActionState.running,
      canManage,
      handleBulkAction,
      handleInviteOpen,
      initialFilters,
      mutationBusy,
    ],
  );

  return {
    columns,
  initialFilters,
  initialData,
  queryHook,
  getRowId: (row) => row.user_id,
  buildToolbarConfig,
  inviteSheetProps: {
      open: isInviteOpen,
      onOpenChange: setInviteOpen,
      onSubmit: handleInviteSubmit,
      isSubmitting: createUserMutation.isPending,
      roles,
    },
    editSheetProps: {
      user: editingUser,
      onOpenChange: setEditingUser,
      onSubmit: handleUpdateSubmit,
      isSubmitting: updateUserMutation.isPending,
      roles,
    },
    dialogs: {
      toggle: {
        dialog: toggleDialog,
        onConfirm: confirmToggleStatus,
        onCancel: () => setToggleDialog(null),
      },
      delete: {
        dialog: deleteDialog,
        onConfirm: confirmHardDelete,
        onCancel: () => setDeleteDialog(null),
      },
      bulkDelete: {
        dialog: bulkDeleteDialog?.users ?? null,
        onConfirm: confirmBulkDelete,
        onCancel: () => setBulkDeleteDialog(null),
        isPending: bulkActionState.running,
      },
    },
  };
}

export function useUsersDataTableQuery(
  filters: UsersTableFilters,
  options?: { initialData?: DataTableQueryResult<UserListItem> },
) {
  const listParams = mapFiltersToListParams(filters);
  const queryOptions =
    options?.initialData !== undefined
      ? {
          initialData: {
            items: options.initialData.items,
            meta: options.initialData.meta ?? null,
          },
        }
      : undefined;

  return useUsers(listParams, queryOptions);
}

export function UsersRealtimeBridge({
  filters,
}: {
  filters: UsersTableFilters;
}) {
  const listFilters = React.useMemo(
    () => mapFiltersToListParams(filters),
    [filters],
  );
  useUsersRealtime(listFilters);
  return null;
}

function mapFiltersToListParams(filters: UsersTableFilters): ListUsersParams {
  const trimmedSearch = filters.search.trim();
  return {
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
    role: filters.role === "all" ? null : filters.role,
    ...(trimmedSearch.length > 0 ? { search: trimmedSearch } : {}),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
