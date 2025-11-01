'use client';

import * as React from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type Table,
  useReactTable,
} from '@tanstack/react-table';
import { toast } from 'sonner';

import { createCategoryColumns } from './columns';
import {
  useCreateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useMenuCategories,
  useMenuCategoriesRealtime,
  useUpdateMenuCategoryMutation,
} from './queries';
import type { MenuCategory } from '../types';
import type { MenuCategoryFilters } from './forms/schema';
import {
  buildCreateMenuCategoryInput,
  buildUpdateMenuCategoryInput,
  clearMenuCategoryFormErrors,
  createDefaultMenuCategoryFormState,
  mapCategoryToFormState,
  type MenuCategoryFormErrors,
  type MenuCategoryFormState,
} from './forms/state';

export type MenuCategoriesTableViewModelOptions = {
  initialItems: MenuCategory[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { status: 'all' | 'active' | 'inactive'; search: string | null };
  } | null;
  canManage: boolean;
};

type PendingState = Record<string, 'toggle' | 'delete' | 'update'>;

type SheetState = {
  mode: 'create' | 'edit';
  isOpen: boolean;
};

type DeleteDialogState = {
  target: MenuCategory | null;
  isOpen: boolean;
};

type SearchController = {
  term: string;
  setTerm: (value: string) => void;
  apply: () => void;
  reset: () => void;
};

type StatusController = {
  value: 'all' | 'active' | 'inactive';
  setValue: (value: 'all' | 'active' | 'inactive') => void;
};

type ToolbarState = {
  search: SearchController;
  status: StatusController;
  canManage: boolean;
};

type SheetController = {
  mode: 'create' | 'edit';
  isOpen: boolean;
  isSubmitting: boolean;
  current: MenuCategory | null;
  form: {
    values: MenuCategoryFormState;
    errors: MenuCategoryFormErrors;
    setValue: <TKey extends keyof MenuCategoryFormState>(
      key: TKey,
      value: MenuCategoryFormState[TKey],
    ) => void;
    clearError: (key: keyof MenuCategoryFormState) => void;
  };
  openCreate: () => void;
  openEdit: (category: MenuCategory) => void;
  onOpenChange: (next: boolean) => void;
  submit: () => Promise<void>;
};

type DeletionController = {
  target: MenuCategory | null;
  isOpen: boolean;
  open: (category: MenuCategory) => void;
  close: () => void;
  confirm: () => Promise<void>;
  isPending: boolean;
};

type PaginationController = {
  page: number;
  pageSize: number;
  total: number;
};

type TableState = {
  table: Table<MenuCategory>;
  isLoading: boolean;
  isSyncing: boolean;
  toolbar: ToolbarState;
  sheet: SheetController;
  deletion: DeletionController;
  pending: PendingState;
  pagination: PaginationController;
  refetch: () => void;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function useMenuCategoriesTableViewModel({
  initialItems,
  initialMeta,
  canManage,
}: MenuCategoriesTableViewModelOptions): TableState {
  const initialFilters: MenuCategoryFilters = {
    search: initialMeta?.filters.search ?? null,
    status: initialMeta?.filters.status ?? 'all',
  };

  const [searchTerm, setSearchTerm] = React.useState(initialFilters.search ?? '');
  const [statusFilter, setStatusFilter] = React.useState<MenuCategoryFilters['status']>(
    initialFilters.status ?? 'all',
  );
  const [filters, setFilters] = React.useState<MenuCategoryFilters>(initialFilters);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'sort_order', desc: false },
  ]);
  const [sheetState, setSheetState] = React.useState<SheetState>({
    mode: 'create',
    isOpen: false,
  });
  const [currentCategory, setCurrentCategory] = React.useState<MenuCategory | null>(
    null,
  );
  const [formState, setFormState] = React.useState<MenuCategoryFormState>(
    createDefaultMenuCategoryFormState(),
  );
  const [formErrors, setFormErrors] = React.useState<MenuCategoryFormErrors>({});
  const [pending, setPending] = React.useState<PendingState>({});
  const [deleteState, setDeleteState] = React.useState<DeleteDialogState>({
    target: null,
    isOpen: false,
  });

  const categoriesQuery = useMenuCategories(filters, {
    initialData: { items: initialItems, meta: initialMeta },
  });
  useMenuCategoriesRealtime(filters);

  const createMutation = useCreateMenuCategoryMutation(filters);
  const updateMutation = useUpdateMenuCategoryMutation(filters);
  const deleteMutation = useDeleteMenuCategoryMutation(filters);

  const items = categoriesQuery.data?.items ?? initialItems;
  const paginationMeta = categoriesQuery.data?.meta?.pagination ?? initialMeta?.pagination ?? {
    page: 1,
    pageSize: items.length,
    total: items.length,
  };

  const setPendingState = React.useCallback(
    (categoryId: string, state?: PendingState[string]) => {
      setPending((prev) => {
        if (!state) {
          if (!(categoryId in prev)) return prev;
          const next = { ...prev };
          delete next[categoryId];
          return next;
        }
        return { ...prev, [categoryId]: state };
      });
    },
    [],
  );

  const closeSheet = React.useCallback(() => {
    setSheetState((prev) => ({ ...prev, isOpen: false }));
    setCurrentCategory(null);
    setFormState(createDefaultMenuCategoryFormState());
    setFormErrors({});
  }, []);

  const openCreate = React.useCallback(() => {
    setSheetState({ mode: 'create', isOpen: true });
    setCurrentCategory(null);
    setFormState(createDefaultMenuCategoryFormState());
    setFormErrors({});
  }, []);

  const openEdit = React.useCallback((category: MenuCategory) => {
    setSheetState({ mode: 'edit', isOpen: true });
    setCurrentCategory(category);
    setFormState(mapCategoryToFormState(category));
    setFormErrors({});
  }, []);

  const handleSheetOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        closeSheet();
      } else {
        setSheetState((prev) => ({ ...prev, isOpen: next }));
      }
    },
    [closeSheet],
  );

  const setFormValue = React.useCallback(
    <TKey extends keyof MenuCategoryFormState>(
      key: TKey,
      value: MenuCategoryFormState[TKey],
    ) => {
      setFormState((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'name' && sheetState.mode === 'create' && !prev.slug.trim()) {
          next.slug = slugify(String(value));
        }
        if (key === 'slug') {
          next.slug = slugify(String(value));
        }
        return next;
      });
      setFormErrors((prev) => clearMenuCategoryFormErrors(prev, key));
    },
    [sheetState.mode],
  );

  const applySearch = React.useCallback(() => {
    const term = searchTerm.trim();
    setFilters((prev) => ({
      ...prev,
      search: term.length ? term : null,
    }));
  }, [searchTerm]);

  const resetFilters = React.useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setFilters({ search: null, status: 'all' });
  }, []);

  React.useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      status: statusFilter ?? 'all',
    }));
  }, [statusFilter]);

  const toggleStatus = React.useCallback(
    async (category: MenuCategory) => {
      if (!canManage) return;
      setPendingState(category.id, 'toggle');
      try {
        await updateMutation.mutateAsync({
          categoryId: category.id,
          input: { isActive: !category.is_active },
        });
        toast.success(
          `${category.name} ${category.is_active ? 'dinonaktifkan' : 'diaktifkan'}`,
        );
      } catch (error) {
        console.error('[MENU_CATEGORY_TOGGLE_FAILED]', error);
        toast.error('Gagal memperbarui status kategori');
      } finally {
        setPendingState(category.id);
      }
    },
    [canManage, setPendingState, updateMutation],
  );

  const submitCreate = React.useCallback(async () => {
    const { result, errors } = buildCreateMenuCategoryInput(formState);
    if (!result) {
      setFormErrors(errors);
      toast.error(errors.global ?? 'Periksa kembali input kategori');
      return;
    }

    setPendingState('new', 'update');
    try {
      await createMutation.mutateAsync(result);
      toast.success('Kategori baru berhasil dibuat');
      closeSheet();
    } catch (error) {
      console.error('[MENU_CATEGORY_CREATE_FAILED]', error);
      toast.error(error instanceof Error ? error.message : 'Gagal membuat kategori');
    } finally {
      setPendingState('new');
    }
  }, [closeSheet, createMutation, formState, setPendingState]);

  const submitUpdate = React.useCallback(async () => {
    const category = currentCategory;
    if (!category) return;
    const { result, errors } = buildUpdateMenuCategoryInput(formState, category);
    if (!result || Object.keys(result).length === 0) {
      if (errors && Object.keys(errors).length > 0) {
        setFormErrors(errors);
        toast.error(errors.global ?? 'Periksa kembali input kategori');
      } else {
        toast.message('Tidak ada perubahan yang disimpan');
        closeSheet();
      }
      return;
    }

    setPendingState(category.id, 'update');
    try {
      await updateMutation.mutateAsync({
        categoryId: category.id,
        input: result,
      });
      toast.success('Kategori diperbarui');
      closeSheet();
    } catch (error) {
      console.error('[MENU_CATEGORY_UPDATE_FAILED]', error);
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui kategori');
    } finally {
      setPendingState(category.id);
    }
  }, [closeSheet, currentCategory, formState, setPendingState, updateMutation]);

  const submit = React.useCallback(async () => {
    if (!canManage) return;
    if (sheetState.mode === 'create') {
      await submitCreate();
    } else {
      await submitUpdate();
    }
  }, [canManage, sheetState.mode, submitCreate, submitUpdate]);

  const openDelete = React.useCallback((category: MenuCategory) => {
    setDeleteState({ target: category, isOpen: true });
  }, []);

  const closeDelete = React.useCallback(() => {
    setDeleteState({ target: null, isOpen: false });
  }, []);

  const confirmDelete = React.useCallback(async () => {
    const target = deleteState.target;
    if (!target) return;
    setPendingState(target.id, 'delete');
    try {
      await deleteMutation.mutateAsync(target.id);
      toast.success(`Kategori ${target.name} dihapus`);
      closeDelete();
    } catch (error) {
      console.error('[MENU_CATEGORY_DELETE_FAILED]', error);
      toast.error('Gagal menghapus kategori');
    } finally {
      setPendingState(target.id);
    }
  }, [closeDelete, deleteMutation, deleteState.target, setPendingState]);

  const columns = React.useMemo(
    () =>
      createCategoryColumns({
        onEdit: openEdit,
        onToggle: toggleStatus,
        onDelete: openDelete,
        pending,
        canManage,
      }),
    [canManage, openDelete, openEdit, pending, toggleStatus],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const toolbar: ToolbarState = React.useMemo(
    () => ({
      search: {
        term: searchTerm,
        setTerm: setSearchTerm,
        apply: applySearch,
        reset: resetFilters,
      },
      status: {
        value: statusFilter ?? 'all',
        setValue: setStatusFilter,
      },
      canManage,
    }),
    [applySearch, canManage, resetFilters, searchTerm, statusFilter],
  );

  const sheet: SheetController = React.useMemo(
    () => ({
      mode: sheetState.mode,
      isOpen: sheetState.isOpen,
      isSubmitting: createMutation.isPending || updateMutation.isPending,
      current: currentCategory,
      form: {
        values: formState,
        errors: formErrors,
        setValue: setFormValue,
        clearError: (key) => {
          setFormErrors((prev) => clearMenuCategoryFormErrors(prev, key));
        },
      },
      openCreate,
      openEdit,
      onOpenChange: handleSheetOpenChange,
      submit,
    }),
    [
      createMutation.isPending,
      currentCategory,
      formErrors,
      formState,
      handleSheetOpenChange,
      openCreate,
      openEdit,
      setFormValue,
      sheetState.isOpen,
      sheetState.mode,
      submit,
      updateMutation.isPending,
    ],
  );

  const deletion: DeletionController = React.useMemo(
    () => ({
      target: deleteState.target,
      isOpen: deleteState.isOpen,
      open: openDelete,
      close: closeDelete,
      confirm: confirmDelete,
      isPending: deleteMutation.isPending,
    }),
    [closeDelete, confirmDelete, deleteMutation.isPending, deleteState.isOpen, deleteState.target, openDelete],
  );

  const pagination: PaginationController = React.useMemo(
    () => ({
      page: paginationMeta.page,
      pageSize: paginationMeta.pageSize,
      total: paginationMeta.total,
    }),
    [paginationMeta.page, paginationMeta.pageSize, paginationMeta.total],
  );

  const isLoading = categoriesQuery.isFetching && !categoriesQuery.isFetched;
  const isSyncing = categoriesQuery.isFetching && categoriesQuery.isFetched;

  return {
    table,
    isLoading,
    isSyncing,
    toolbar,
    sheet,
    deletion,
    pending,
    pagination,
    refetch: () => {
      void categoriesQuery.refetch();
    },
  };
}
