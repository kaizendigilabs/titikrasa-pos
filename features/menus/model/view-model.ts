'use client';

import * as React from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { toast } from 'sonner';

import { createMenuColumns } from './columns';
import {
  useCreateMenuMutation,
  useDeleteMenuMutation,
  useMenus,
  useMenusRealtime,
  useToggleMenuStatusMutation,
  useUpdateMenuMutation,
} from './queries';
import {
  createDefaultMenuFormState,
  mapMenuToFormState,
  type MenuFormState,
  type MenuFormSubmitPayload,
} from './forms/state';
import type { MenuFilters, MenuListItem } from '../types';

type MenuTableMeta = {
  pagination: { page: number; pageSize: number; total: number };
  filters: {
    status: 'all' | 'active' | 'inactive';
    type: 'all' | 'simple' | 'variant';
    categoryId: string | null;
    search: string | null;
  };
};

type MenuTableCategory = { id: string; name: string };

type MenuTableViewModelOptions = {
  initialItems: MenuListItem[];
  initialMeta: MenuTableMeta;
  categories: MenuTableCategory[];
  canManage: boolean;
};

type PendingState = Record<string, 'toggle' | 'delete' | 'update'>;

type MenuTableFiltersState = {
  search: string | null;
  status: 'all' | 'active' | 'inactive';
  type: 'all' | 'simple' | 'variant';
  categoryId: string | null;
};

type MenuFormMode = 'create' | 'edit';

type DeleteDialogState = {
  target: MenuListItem | null;
  isOpen: boolean;
};

export function useMenuTableViewModel({
  initialItems,
  initialMeta,
  categories,
  canManage,
}: MenuTableViewModelOptions) {
  const [searchTerm, setSearchTerm] = React.useState(
    initialMeta.filters.search ?? '',
  );
  const [status, setStatus] = React.useState<MenuTableFiltersState['status']>(
    initialMeta.filters.status,
  );
  const [typeFilter, setTypeFilter] = React.useState<MenuTableFiltersState['type']>(
    initialMeta.filters.type,
  );
  const [categoryFilter, setCategoryFilter] = React.useState(
    initialMeta.filters.categoryId ?? 'all',
  );
  const [filters, setFilters] = React.useState<MenuTableFiltersState>({
    search: initialMeta.filters.search,
    status: initialMeta.filters.status,
    type: initialMeta.filters.type,
    categoryId: initialMeta.filters.categoryId,
  });
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'name', desc: false },
  ]);
  const [pending, setPending] = React.useState<PendingState>({});
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [mode, setMode] = React.useState<MenuFormMode>('create');
  const [currentMenu, setCurrentMenu] = React.useState<MenuListItem | null>(null);
  const [formValues, setFormValues] = React.useState<MenuFormState>(
    createDefaultMenuFormState(),
  );
  const [deleteDialog, setDeleteDialog] = React.useState<DeleteDialogState>({
    target: null,
    isOpen: false,
  });

  const appliedFilters = React.useMemo<MenuFilters>(() => ({
    search: filters.search ?? null,
    status: filters.status ?? 'all',
    type: filters.type ?? 'all',
    categoryId: filters.categoryId ?? null,
  }), [filters]);

  const menusQuery = useMenus(appliedFilters, {
    initialData: {
      items: initialItems,
      meta: initialMeta,
    },
  });

  useMenusRealtime(appliedFilters);

  const createMutation = useCreateMenuMutation(appliedFilters);
  const updateMutation = useUpdateMenuMutation(appliedFilters);
  const deleteMutation = useDeleteMenuMutation(appliedFilters);
  const toggleMutation = useToggleMenuStatusMutation(appliedFilters);

  const items = menusQuery.data?.items ?? initialItems;
  const isLoading = menusQuery.isFetching;

  React.useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      status,
    }));
  }, [status]);

  React.useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      type: typeFilter,
    }));
  }, [typeFilter]);

  React.useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      categoryId: categoryFilter === 'all' ? null : categoryFilter,
    }));
  }, [categoryFilter]);

  const applySearch = React.useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchTerm.trim() ? searchTerm.trim() : null,
    }));
  }, [searchTerm]);

  const updatePending = React.useCallback(
    (menuId: string, state?: PendingState[string]) => {
      setPending((prev) => {
        const next = { ...prev };
        if (!state) {
          delete next[menuId];
          return next;
        }
        next[menuId] = state;
        return next;
      });
    },
    [],
  );

  const handleOpenCreate = React.useCallback(() => {
    setMode('create');
    setCurrentMenu(null);
    setFormValues(createDefaultMenuFormState());
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = React.useCallback((menu: MenuListItem) => {
    setMode('edit');
    setCurrentMenu(menu);
    setFormValues(mapMenuToFormState(menu));
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = React.useCallback((next: boolean) => {
    if (!next) {
      setCurrentMenu(null);
      setFormValues(createDefaultMenuFormState());
    }
    setSheetOpen(next);
  }, []);

  const handleSubmitMenu = React.useCallback(
    async (payload: MenuFormSubmitPayload) => {
      if (!canManage) return;

      if (mode === 'create') {
        updatePending('new', 'update');
        try {
          await createMutation.mutateAsync(payload);
          toast.success('Menu baru berhasil dibuat');
          handleSheetOpenChange(false);
        } catch (error) {
          console.error('[MENUS_CREATE_ERROR]', error);
          toast.error(
            error instanceof Error ? error.message : 'Gagal membuat menu',
          );
        } finally {
          updatePending('new');
        }
        return;
      }

      if (!currentMenu) return;
      updatePending(currentMenu.id, 'update');
      try {
        const input =
          payload.type === 'simple'
            ? {
                type: payload.type,
                name: payload.name,
                sku: payload.sku ?? null,
                categoryId: payload.categoryId ?? null,
                thumbnailUrl: payload.thumbnailUrl ?? null,
                isActive: payload.isActive,
                price: payload.price,
                resellerPrice: payload.resellerPrice ?? null,
              }
            : {
                type: payload.type,
                name: payload.name,
                sku: payload.sku ?? null,
                categoryId: payload.categoryId ?? null,
                thumbnailUrl: payload.thumbnailUrl ?? null,
                isActive: payload.isActive,
                variants: payload.variants,
              };

        await updateMutation.mutateAsync({
          menuId: currentMenu.id,
          input,
        });
        toast.success('Menu berhasil diperbarui');
        handleSheetOpenChange(false);
      } catch (error) {
        console.error('[MENUS_UPDATE_ERROR]', error);
        toast.error(
          error instanceof Error ? error.message : 'Gagal memperbarui menu',
        );
      } finally {
        updatePending(currentMenu.id);
      }
    },
    [
      canManage,
      mode,
      currentMenu,
      createMutation,
      updateMutation,
      handleSheetOpenChange,
      updatePending,
    ],
  );

  const handleToggleStatus = React.useCallback(
    async (menu: MenuListItem) => {
      if (!canManage) return;
      updatePending(menu.id, 'toggle');
      try {
        await toggleMutation.mutateAsync({
          menuId: menu.id,
          isActive: !menu.is_active,
        });
        toast.success(
          `${menu.name} kini ${!menu.is_active ? 'aktif' : 'nonaktif'}`,
        );
      } catch (error) {
        console.error('[MENUS_TOGGLE_ERROR]', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Gagal mengubah status menu',
        );
      } finally {
        updatePending(menu.id);
      }
    },
    [canManage, toggleMutation, updatePending],
  );

  const handleConfirmDelete = React.useCallback((menu: MenuListItem) => {
    setDeleteDialog({ target: menu, isOpen: true });
  }, []);

  const handleCloseDelete = React.useCallback(() => {
    setDeleteDialog({ target: null, isOpen: false });
  }, []);

  const handleDeleteMenu = React.useCallback(async () => {
    if (!deleteDialog.target) return;
    updatePending(deleteDialog.target.id, 'delete');
    try {
      await deleteMutation.mutateAsync(deleteDialog.target.id);
      toast.success('Menu berhasil dihapus');
    } catch (error) {
      console.error('[MENUS_DELETE_ERROR]', error);
      toast.error(
        error instanceof Error ? error.message : 'Gagal menghapus menu',
      );
    } finally {
      updatePending(deleteDialog.target.id);
      handleCloseDelete();
    }
  }, [deleteDialog.target, deleteMutation, handleCloseDelete, updatePending]);

  const columns = React.useMemo(
    () =>
      createMenuColumns({
        onEdit: handleOpenEdit,
        onToggleStatus: handleToggleStatus,
        onDelete: handleConfirmDelete,
        pending,
        canManage,
      }),
    [handleOpenEdit, handleToggleStatus, handleConfirmDelete, pending, canManage],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return {
    table,
    categories,
    canManage,
    isLoading,
    query: menusQuery,
    search: {
      term: searchTerm,
      setTerm: setSearchTerm,
      apply: applySearch,
    },
    filters: {
      status,
      setStatus,
      type: typeFilter,
      setType: setTypeFilter,
      category: categoryFilter,
      setCategory: setCategoryFilter,
    },
    sheet: {
      isOpen: sheetOpen,
      openCreate: handleOpenCreate,
      openEdit: handleOpenEdit,
      onOpenChange: handleSheetOpenChange,
      mode,
      initialValues: formValues,
      isSubmitting: createMutation.isPending || updateMutation.isPending,
      onSubmit: handleSubmitMenu,
      currentMenu,
    },
    deletion: {
      ...deleteDialog,
      open: handleConfirmDelete,
      close: handleCloseDelete,
      confirm: handleDeleteMenu,
      isDeleting: deleteMutation.isPending,
    },
    pending,
    refetch: menusQuery.refetch,
  };
}
