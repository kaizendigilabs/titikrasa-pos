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
import { createMenuColumns } from '../columns';
import type { MenuListItem, MenuFilters } from '@/features/menus/types';
import {
  useMenus,
  useMenusRealtime,
  useCreateMenuMutation,
  useDeleteMenuMutation,
  useToggleMenuStatusMutation,
  useUpdateMenuMutation,
} from '@/features/menus/hooks';
import { useMenuCategories } from '@/features/menu-categories/hooks';
import {
  createDefaultMenuFormValues,
  mapMenuToFormValues,
  type MenuFormSubmitPayload,
  type MenuFormValues,
} from './forms';
import type { ToggleDialogState } from './dialogs';
import { AppError } from '@/lib/utils/errors';

export type MenusTableFilters = PaginationFilters & {
  search: string;
  status: 'all' | 'active' | 'inactive';
  type: 'all' | 'simple' | 'variant';
  categoryId: string | null;
};

export type UseMenusTableControllerArgs = {
  initialMenus: MenuListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: 'all' | 'active' | 'inactive';
      type: 'all' | 'simple' | 'variant';
      categoryId: string | null;
      search: string | null;
    };
  };
  categories: Array<{ id: string; name: string }>;
  canManage: boolean;
};

type MenuFormController = {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: MenuFormValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MenuFormSubmitPayload) => Promise<void>;
  isSubmitting: boolean;
  categories: Array<{ id: string; name: string }>;
};

type MenuDialogs = {
  toggle: {
    dialog: ToggleDialogState;
    onConfirm: () => void;
    onCancel: () => void;
  };
  delete: {
    dialog: MenuListItem | null;
    onConfirm: () => void;
    onCancel: () => void;
  };
};

type UseMenusTableControllerResult = {
  columns: ColumnDef<MenuListItem, unknown>[];
  initialFilters: MenusTableFilters;
  initialData: DataTableQueryResult<MenuListItem>;
  queryHook: DataTableQueryHook<MenuListItem, MenusTableFilters>;
  getRowId: (row: MenuListItem) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<MenuListItem, MenusTableFilters>,
  ) => DataTableToolbarProps;
  formDialogProps: MenuFormController;
  dialogs: MenuDialogs;
};

export function useMenusTableController({
  initialMenus,
  initialMeta,
  categories,
  canManage,
}: UseMenusTableControllerArgs): UseMenusTableControllerResult {
  const [formState, setFormState] = React.useState<{
    open: boolean;
    mode: 'create' | 'edit';
    menu: MenuListItem | null;
  }>({ open: false, mode: 'create', menu: null });
  const [pendingActions, setPendingActions] = React.useState<
    Record<string, 'toggle' | 'delete' | 'update'>
  >({});
  const [toggleDialog, setToggleDialog] = React.useState<ToggleDialogState>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<MenuListItem | null>(null);

  const initialFilters = React.useMemo<MenusTableFilters>(() => {
    return {
      page: initialMeta.pagination.page ?? 1,
      pageSize: initialMeta.pagination.pageSize ?? 50,
      search: initialMeta.filters.search ?? '',
      status: initialMeta.filters.status ?? 'all',
      type: initialMeta.filters.type ?? 'all',
      categoryId: initialMeta.filters.categoryId ?? null,
    };
  }, [initialMeta]);

  const columns = React.useMemo<ColumnDef<MenuListItem>[]>(() => {
    return createMenuColumns({
      onEdit: (menu) => {
        if (!canManage) return;
        setFormState({ open: true, mode: 'edit', menu });
      },
      onToggleStatus: (menu) => {
        if (!canManage) return;
        setToggleDialog({ menu, nextStatus: !menu.is_active });
      },
      onDelete: (menu) => {
        if (!canManage) return;
        setDeleteDialog(menu);
      },
      pendingActions,
      canManage,
    });
  }, [canManage, pendingActions]);

  const queryHook = useMenusDataTableQuery;

  const createMutation = useCreateMenuMutation();
  const updateMutation = useUpdateMenuMutation();
  const toggleMutation = useToggleMenuStatusMutation();
  const deleteMutation = useDeleteMenuMutation();

  const categoriesQuery = useMenuCategories(
    { page: 1, pageSize: 200, status: 'all', search: null },
    { initialData: { items: categories, meta: null } as any },
  );

  const formInitialValues = React.useMemo(() => {
    if (formState.mode === 'edit' && formState.menu) {
      return mapMenuToFormValues(formState.menu);
    }
    return createDefaultMenuFormValues();
  }, [formState]);

  const handleFormOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      setFormState({ open: false, mode: 'create', menu: null });
    } else {
      setFormState((prev) => ({ ...prev, open: true }));
    }
  }, []);

  const invalidateFormState = React.useCallback(() => {
    setFormState({ open: false, mode: 'create', menu: null });
  }, []);

  const handleFormSubmit = React.useCallback(
    async (payload: MenuFormSubmitPayload) => {
      try {
        if (formState.mode === 'edit' && formState.menu) {
          const targetId = formState.menu.id;
          setPendingActions((prev) => ({ ...prev, [targetId]: 'update' }));
          await updateMutation.mutateAsync({
            menuId: targetId,
            input: mapPayloadToUpdateInput(payload),
          });
          toast.success('Menu diperbarui');
        } else {
          await createMutation.mutateAsync(payload);
          toast.success('Menu berhasil dibuat');
        }
        invalidateFormState();
      } catch (error) {
        toast.error(getErrorMessage(error, 'Gagal menyimpan menu'));
        throw error;
      } finally {
        if (formState.mode === 'edit' && formState.menu) {
          setPendingActions((prev) => {
            const next = { ...prev };
            delete next[formState.menu!.id];
            return next;
          });
        }
      }
    },
    [
      createMutation,
      formState,
      invalidateFormState,
      updateMutation,
      setPendingActions,
    ],
  );

  const performToggleStatus = React.useCallback(
    async (dialog: ToggleDialogState) => {
      if (!dialog) return;
      const menuId = dialog.menu.id;
      setPendingActions((prev) => ({ ...prev, [menuId]: 'toggle' }));
      try {
        await toggleMutation.mutateAsync({
          menuId,
          isActive: dialog.nextStatus,
        });
        toast.success(
          dialog.nextStatus
            ? 'Menu diaktifkan'
            : 'Menu dinonaktifkan',
        );
      } catch (error) {
        toast.error(getErrorMessage(error, 'Gagal memperbarui status'));
      } finally {
        setPendingActions((prev) => {
          const next = { ...prev };
          delete next[menuId];
          return next;
        });
      }
    },
    [toggleMutation],
  );

  const performDelete = React.useCallback(
    async (menu: MenuListItem | null) => {
      if (!menu) return;
      setPendingActions((prev) => ({ ...prev, [menu.id]: 'delete' }));
      try {
        await deleteMutation.mutateAsync(menu.id);
        toast.success('Menu dihapus');
      } catch (error) {
        toast.error(getErrorMessage(error, 'Gagal menghapus menu'));
      } finally {
        setPendingActions((prev) => {
          const next = { ...prev };
          delete next[menu.id];
          return next;
        });
      }
    },
    [deleteMutation],
  );

  const confirmToggleStatus = React.useCallback(async () => {
    await performToggleStatus(toggleDialog);
    setToggleDialog(null);
  }, [performToggleStatus, toggleDialog]);

  const confirmDelete = React.useCallback(async () => {
    await performDelete(deleteDialog);
    setDeleteDialog(null);
  }, [deleteDialog, performDelete]);

  const mutationBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    toggleMutation.isPending ||
    deleteMutation.isPending;

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<MenuListItem, MenusTableFilters>,
    ): DataTableToolbarProps => {
      const isBusy = context.isInitialLoading || mutationBusy;
      const showReset =
        context.filters.search.trim().length > 0 ||
        context.filters.status !== initialFilters.status ||
        context.filters.type !== initialFilters.type ||
        (context.filters.categoryId ?? null) !==
          (initialFilters.categoryId ?? null);

      return {
        search: {
          value: context.filters.search,
          onChange: (value) =>
            context.updateFilters({ search: value }),
          placeholder: 'Cari nama atau SKU',
          disabled: isBusy,
        },
        filters: [
          {
            type: 'select',
            id: 'status-filter',
            value: context.filters.status,
            onValueChange: (value) =>
              context.updateFilters({
                status: value as MenusTableFilters['status'],
              }),
            options: [
              { label: 'Semua status', value: 'all' },
              { label: 'Aktif', value: 'active' },
              { label: 'Nonaktif', value: 'inactive' },
            ],
            disabled: isBusy,
          },
          {
            type: 'select',
            id: 'type-filter',
            value: context.filters.type,
            onValueChange: (value) =>
              context.updateFilters({
                type: value as MenusTableFilters['type'],
              }),
            options: [
              { label: 'Semua tipe', value: 'all' },
              { label: 'Simple', value: 'simple' },
              { label: 'Variant', value: 'variant' },
            ],
            disabled: isBusy,
          },
          {
            type: 'select',
            id: 'category-filter',
            value: context.filters.categoryId ?? 'all',
            onValueChange: (value) =>
              context.updateFilters({
                categoryId: value === 'all' ? null : value,
              }),
            options: [
              { label: 'Semua kategori', value: 'all' },
              ...categories.map((category) => ({
                label: category.name,
                value: category.id,
              })),
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
            onClick={() => setFormState({ open: true, mode: 'create', menu: null })}
            disabled={isBusy}
          >
            Menu Baru
          </Button>
        ) : null,
      };
    },
    [canManage, categories, initialFilters, mutationBusy],
  );

  return {
    columns,
    initialFilters,
    initialData: {
      items: initialMenus,
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
      categories: categoriesQuery.data?.items ?? categories,
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
    },
  };
}

export function useMenusDataTableQuery(
  filters: MenusTableFilters,
  options?: { initialData?: DataTableQueryResult<MenuListItem> },
) {
  const listFilters: MenuFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
    type: filters.type,
    categoryId: filters.categoryId ?? undefined,
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

  return useMenus(listFilters, hookOptions);
}

export function MenusRealtimeBridge({
  filters,
}: {
  filters: MenusTableFilters;
}) {
  const realtimeFilters = React.useMemo<MenuFilters>(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      type: filters.type,
      categoryId: filters.categoryId ?? undefined,
      ...(filters.search.trim().length > 0
        ? { search: filters.search.trim() }
        : {}),
    }),
    [filters],
  );

  useMenusRealtime(realtimeFilters);
  return null;
}

function mapPayloadToUpdateInput(payload: MenuFormSubmitPayload) {
  if (payload.type === 'simple') {
    return {
      type: 'simple' as const,
      name: payload.name,
      sku: payload.sku ?? null,
      categoryId: payload.categoryId ?? null,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      isActive: payload.isActive,
      price: payload.price,
      resellerPrice: payload.resellerPrice ?? null,
    };
  }

  return {
    type: 'variant' as const,
    name: payload.name,
    sku: payload.sku ?? null,
    categoryId: payload.categoryId ?? null,
    thumbnailUrl: payload.thumbnailUrl ?? null,
    isActive: payload.isActive,
    variants: payload.variants,
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
