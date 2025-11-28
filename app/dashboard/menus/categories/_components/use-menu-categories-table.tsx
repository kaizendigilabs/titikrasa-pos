'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

import type { DataTableRenderContext } from '@/components/tables/data-table';
import {
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
} from '@/components/tables/use-data-table-state';
import type { DataTableToolbarProps } from '@/components/tables/data-table-toolbar';
import { Button } from '@/components/ui/button';
import { createCategoryColumns } from '../columns';
import type {
  MenuCategory,
  MenuCategoryFilters,
} from '@/features/menu-categories/types';
import {
  useMenuCategories,
  useMenuCategoriesRealtime,
  useCreateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from '@/features/menu-categories/hooks';
import {
  createDefaultCategoryFormValues,
  mapCategoryToFormValues,
  type CategoryFormSubmitPayload,
  type CategoryFormValues,
} from './forms';
import type { ToggleCategoryDialog } from './dialogs';
import { AppError } from '@/lib/utils/errors';

export type MenuCategoriesTableFilters = PaginationFilters & {
  search: string;
  status: 'all' | 'active' | 'inactive';
};

export type UseMenuCategoriesTableControllerArgs = {
  initialCategories: MenuCategory[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { status: 'all' | 'active' | 'inactive'; search: string | null };
  };
  canManage: boolean;
};

type CategoryFormController = {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: CategoryFormValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CategoryFormSubmitPayload) => Promise<void>;
  isSubmitting: boolean;
};

type CategoryDialogs = {
  toggle: {
    dialog: ToggleCategoryDialog;
    onConfirm: () => void;
    onCancel: () => void;
  };
  delete: {
    dialog: MenuCategory | null;
    onConfirm: () => void;
    onCancel: () => void;
  };
};

type UseMenuCategoriesTableControllerResult = {
  columns: ColumnDef<MenuCategory, unknown>[];
  initialFilters: MenuCategoriesTableFilters;
  initialData: DataTableQueryResult<MenuCategory>;
  queryHook: DataTableQueryHook<MenuCategory, MenuCategoriesTableFilters>;
  getRowId: (row: MenuCategory) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<MenuCategory, MenuCategoriesTableFilters>,
  ) => DataTableToolbarProps;
  formDialogProps: CategoryFormController;
  dialogs: CategoryDialogs;
};

export function useMenuCategoriesTableController({
  initialCategories,
  initialMeta,
  canManage,
}: UseMenuCategoriesTableControllerArgs): UseMenuCategoriesTableControllerResult {
  const [formState, setFormState] = React.useState<{
    open: boolean;
    mode: 'create' | 'edit';
    category: MenuCategory | null;
  }>({ open: false, mode: 'create', category: null });
  const [pendingActions, setPendingActions] = React.useState<
    Record<string, 'toggle' | 'delete' | 'update'>
  >({});
  const [toggleDialog, setToggleDialog] =
    React.useState<ToggleCategoryDialog>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<MenuCategory | null>(null);

  const initialFilters = React.useMemo<MenuCategoriesTableFilters>(() => {
    return {
      page: initialMeta.pagination.page ?? 1,
      pageSize: initialMeta.pagination.pageSize ?? 50,
      search: initialMeta.filters.search ?? '',
      status: initialMeta.filters.status ?? 'all',
    };
  }, [initialMeta]);

  const columns = React.useMemo<ColumnDef<MenuCategory>[]>(() => {
    return createCategoryColumns({
      onEdit: (category) => {
        if (!canManage) return;
        setFormState({ open: true, mode: 'edit', category });
      },
      onToggle: (category) => {
        if (!canManage) return;
        setToggleDialog({ category, nextStatus: !category.is_active });
      },
      onDelete: (category) => {
        if (!canManage) return;
        setDeleteDialog(category);
      },
      pendingActions,
      canManage,
    });
  }, [canManage, pendingActions]);

  const createMutation = useCreateMenuCategoryMutation();
  const updateMutation = useUpdateMenuCategoryMutation();
  const deleteMutation = useDeleteMenuCategoryMutation();

  const queryHook = useMenuCategoriesDataTableQuery;

  const formInitialValues = React.useMemo(() => {
    if (formState.mode === 'edit' && formState.category) {
      return mapCategoryToFormValues(formState.category);
    }
    return createDefaultCategoryFormValues();
  }, [formState]);

  const handleFormOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      setFormState({ open: false, mode: 'create', category: null });
    } else {
      setFormState((prev) => ({ ...prev, open: true }));
    }
  }, []);

  const handleFormSubmit = React.useCallback(
    async (payload: CategoryFormSubmitPayload) => {
      try {
        if (formState.mode === 'edit' && formState.category) {
          const categoryId = formState.category.id;
          setPendingActions((prev) => ({ ...prev, [categoryId]: 'update' }));
          await updateMutation.mutateAsync({
            categoryId,
            input: payload,
          });
          toast.success('Kategori diperbarui');
        } else {
          await createMutation.mutateAsync(payload);
          toast.success('Kategori dibuat');
        }
        setFormState({ open: false, mode: 'create', category: null });
      } catch (error) {
        toast.error(getErrorMessage(error, 'Gagal menyimpan kategori'));
        throw error;
      } finally {
        if (formState.mode === 'edit' && formState.category) {
          setPendingActions((prev) => {
            const next = { ...prev };
            delete next[formState.category!.id];
            return next;
          });
        }
      }
    },
    [createMutation, formState, updateMutation],
  );

  const performToggle = React.useCallback(
    async (dialog: ToggleCategoryDialog) => {
      if (!dialog) return;
      const categoryId = dialog.category.id;
      setPendingActions((prev) => ({ ...prev, [categoryId]: 'toggle' }));
      try {
        await updateMutation.mutateAsync({
          categoryId,
          input: { isActive: dialog.nextStatus },
        });
        toast.success(
          dialog.nextStatus
            ? 'Kategori diaktifkan'
            : 'Kategori dinonaktifkan',
        );
      } catch (error) {
        toast.error(getErrorMessage(error, 'Gagal memperbarui status'));
      } finally {
        setPendingActions((prev) => {
          const next = { ...prev };
          delete next[categoryId];
          return next;
        });
      }
    },
    [updateMutation],
  );

  const performDelete = React.useCallback(
    async (category: MenuCategory | null) => {
      if (!category) return;
      setPendingActions((prev) => ({ ...prev, [category.id]: 'delete' }));
      try {
        await deleteMutation.mutateAsync(category.id);
        toast.success('Kategori dihapus');
      } catch (error) {
        toast.error(getErrorMessage(error, 'Gagal menghapus kategori'));
      } finally {
        setPendingActions((prev) => {
          const next = { ...prev };
          delete next[category.id];
          return next;
        });
      }
    },
    [deleteMutation],
  );

  const mutationBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<MenuCategory, MenuCategoriesTableFilters>,
    ): DataTableToolbarProps => {
      const isBusy = context.isInitialLoading || mutationBusy;
      const showReset =
        context.filters.search.trim().length > 0 ||
        context.filters.status !== initialFilters.status;

      return {
        search: {
          value: context.filters.search,
          onChange: (value) => context.updateFilters({ search: value }),
          placeholder: 'Cari nama atau slug',
          disabled: isBusy,
        },
        filters: [
          {
            type: 'select',
            id: 'status-filter',
            value: context.filters.status,
            onValueChange: (value) =>
              context.updateFilters({
                status: value as MenuCategoriesTableFilters['status'],
              }),
            options: [
              { label: 'Semua status', value: 'all' },
              { label: 'Aktif', value: 'active' },
              { label: 'Nonaktif', value: 'inactive' },
            ],
            disabled: isBusy,
          },
        ],
        reset: {
          visible: showReset,
          onReset: () => context.updateFilters(() => initialFilters),
          disabled: isBusy,
        },
        status: {
          isSyncing: context.isSyncing,
        },
        primaryAction: canManage ? (
          <Button
            onClick={() =>
              setFormState({ open: true, mode: 'create', category: null })
            }
            disabled={isBusy}
          >
            Kategori Baru
          </Button>
        ) : null,
      };
    },
    [canManage, initialFilters, mutationBusy],
  );

  return {
    columns,
    initialFilters,
    initialData: {
      items: initialCategories,
      meta: initialMeta,
    },
    queryHook,
    getRowId: (row) => row.id,
    buildToolbarConfig,
    formDialogProps: {
      open: formState.open,
      mode: formState.mode,
      initialValues: formInitialValues,
      onOpenChange: handleFormOpenChange,
      onSubmit: handleFormSubmit,
      isSubmitting: createMutation.isPending || updateMutation.isPending,
    },
    dialogs: {
      toggle: {
        dialog: toggleDialog,
        onConfirm: async () => {
          await performToggle(toggleDialog);
          setToggleDialog(null);
        },
        onCancel: () => setToggleDialog(null),
      },
      delete: {
        dialog: deleteDialog,
        onConfirm: async () => {
          await performDelete(deleteDialog);
          setDeleteDialog(null);
        },
        onCancel: () => setDeleteDialog(null),
      },
    },
  };
}

export function useMenuCategoriesDataTableQuery(
  filters: MenuCategoriesTableFilters,
  options?: { initialData?: DataTableQueryResult<MenuCategory> },
) {
  const queryFilters: MenuCategoryFilters = {
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
          meta: options.initialData.meta ?? null,
        },
      }
    : undefined;

  return useMenuCategories(queryFilters, hookOptions);
}

export function MenuCategoriesRealtimeBridge({
  filters,
}: {
  filters: MenuCategoriesTableFilters;
}) {
  const realtimeFilters = React.useMemo<MenuCategoryFilters>(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      ...(filters.search.trim().length > 0
        ? { search: filters.search.trim() }
        : {}),
    }),
    [filters],
  );
  useMenuCategoriesRealtime(realtimeFilters);
  return null;
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
