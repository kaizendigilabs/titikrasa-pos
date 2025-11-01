'use client';

import * as React from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type Table,
} from '@tanstack/react-table';
import { toast } from 'sonner';

import { createSupplierColumns, type SupplierRowPendingState } from './columns';
import {
  buildCreateCatalogItemInput,
  buildCreateSupplierInput,
  buildUpdateCatalogItemInput,
  buildUpdateSupplierInput,
  createDefaultCatalogFormState,
  createDefaultSupplierFormState,
  mapCatalogItemToFormState,
  mapSupplierToFormState,
  normalizeSupplierFilters,
  type CatalogFormErrors,
  type CatalogFormState,
  type SupplierFormErrors,
  type SupplierFormState,
} from './forms/state';
import type { SupplierFilters } from './forms/schema';
import {
  useCreateCatalogItemMutation,
  useCreateSupplierMutation,
  useDeleteCatalogItemMutation,
  useDeleteSupplierMutation,
  useSupplierCatalog,
  useSuppliers,
  useSuppliersRealtime,
  useToggleCatalogItemMutation,
  useUpdateCatalogItemMutation,
  useUpdateSupplierMutation,
} from './queries';
import type { SupplierCatalogItem, SupplierListItem } from '../types';

export type SuppliersTableOptions = {
  initialItems: SupplierListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { search: string | null; status: 'all' | 'active' | 'inactive' };
  } | null;
  canManage: boolean;
};

export type ToolbarState = {
  search: {
    term: string;
    setTerm: (value: string) => void;
    apply: () => void;
    reset: () => void;
  };
  status: {
    value: 'all' | 'active' | 'inactive';
    setValue: (value: 'all' | 'active' | 'inactive') => void;
  };
  canManage: boolean;
};

export type PaginationController = {
  page: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

export type FormController<TState, TErrors> = {
  values: TState;
  errors: TErrors;
  setValue: <TKey extends keyof TState>(key: TKey, value: TState[TKey]) => void;
  clearError: (key: keyof TErrors) => void;
};

type SheetController = {
  mode: 'create' | 'edit';
  isOpen: boolean;
  isSubmitting: boolean;
  form: FormController<SupplierFormState, SupplierFormErrors>;
  openCreate: () => void;
  openEdit: (supplier: SupplierListItem) => void;
  onOpenChange: (next: boolean) => void;
  submit: () => Promise<void>;
};

type DeleteDialog = {
  target: SupplierListItem | null;
  isOpen: boolean;
};

type DeletionController = {
  target: SupplierListItem | null;
  isOpen: boolean;
  isDeleting: boolean;
  open: (supplier: SupplierListItem) => void;
  close: () => void;
  confirm: () => Promise<void>;
};

type CatalogController = {
  isOpen: boolean;
  supplier: SupplierListItem | null;
  items: SupplierCatalogItem[];
  isLoading: boolean;
  isMutating: boolean;
  mode: 'create' | 'edit';
  form: FormController<CatalogFormState, CatalogFormErrors>;
  open: (supplier: SupplierListItem) => void;
  close: () => void;
  submit: () => Promise<void>;
  editItem: (item: SupplierCatalogItem) => void;
  resetForm: () => void;
  toggleItem: (item: SupplierCatalogItem) => Promise<void>;
  deleteItem: (item: SupplierCatalogItem) => Promise<void>;
};

export type SuppliersTableViewModel = {
  table: Table<SupplierListItem>;
  isLoading: boolean;
  isSyncing: boolean;
  toolbar: ToolbarState;
  pagination: PaginationController;
  sheet: SheetController;
  deletion: DeletionController;
  catalog: CatalogController;
  refetch: () => void;
  pending: SupplierRowPendingState;
};

function buildInitialFilters(meta: SuppliersTableOptions['initialMeta']): SupplierFilters {
  return normalizeSupplierFilters({
    page: meta?.pagination.page ?? 1,
    pageSize: meta?.pagination.pageSize ?? 25,
    search: meta?.filters.search ?? undefined,
    status: meta?.filters.status ?? 'all',
  });
}

export function useSuppliersTableViewModel({
  initialItems,
  initialMeta,
  canManage,
}: SuppliersTableOptions): SuppliersTableViewModel {
  const [searchTerm, setSearchTerm] = React.useState(initialMeta?.filters.search ?? '');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>(
    initialMeta?.filters.status ?? 'all',
  );
  const [filters, setFilters] = React.useState<SupplierFilters>(() => buildInitialFilters(initialMeta));
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pending, setPending] = React.useState<SupplierRowPendingState>({});
  const [sheetState, setSheetState] = React.useState<{
    mode: 'create' | 'edit';
    isOpen: boolean;
    current: SupplierListItem | null;
  }>({ mode: 'create', isOpen: false, current: null });
  const [supplierForm, setSupplierForm] = React.useState<SupplierFormState>(
    createDefaultSupplierFormState(),
  );
  const [supplierErrors, setSupplierErrors] = React.useState<SupplierFormErrors>({});
  const [deleteDialog, setDeleteDialog] = React.useState<DeleteDialog>({
    target: null,
    isOpen: false,
  });
  const [catalogState, setCatalogState] = React.useState<{
    supplier: SupplierListItem | null;
    mode: 'create' | 'edit';
    currentItem: SupplierCatalogItem | null;
    isOpen: boolean;
  }>({ supplier: null, mode: 'create', currentItem: null, isOpen: false });
  const [catalogForm, setCatalogForm] = React.useState<CatalogFormState>(
    createDefaultCatalogFormState(),
  );
  const [catalogErrors, setCatalogErrors] = React.useState<CatalogFormErrors>({});

  const suppliersQuery = useSuppliers(filters, {
    initialData: {
      items: initialItems,
      meta: initialMeta,
    },
  });
  useSuppliersRealtime({ enabled: true });

  const items = suppliersQuery.data?.items ?? initialItems;
  const meta = suppliersQuery.data?.meta ?? initialMeta;
  const paginationMeta = meta?.pagination ?? initialMeta?.pagination ?? {
    page: filters.page,
    pageSize: filters.pageSize,
    total: items.length,
  };

  const pageCount = React.useMemo(() => {
    const total = paginationMeta.total ?? items.length;
    const size = Math.max(1, paginationMeta.pageSize ?? filters.pageSize);
    return Math.max(1, Math.ceil(total / size));
  }, [filters.pageSize, items.length, paginationMeta.pageSize, paginationMeta.total]);

  const createSupplierMutation = useCreateSupplierMutation();
  const updateSupplierMutation = useUpdateSupplierMutation();
  const deleteSupplierMutation = useDeleteSupplierMutation();

  const catalogSupplierId = catalogState.supplier?.id ?? '';
  const catalogQuery = useSupplierCatalog({
    supplierId: catalogSupplierId,
    enabled: catalogState.isOpen && Boolean(catalogSupplierId),
  });
  const createCatalogMutation = useCreateCatalogItemMutation(catalogSupplierId);
  const updateCatalogMutation = useUpdateCatalogItemMutation(catalogSupplierId);
  const toggleCatalogMutation = useToggleCatalogItemMutation(catalogSupplierId);
  const deleteCatalogMutation = useDeleteCatalogItemMutation(catalogSupplierId);

  const toolbar: ToolbarState = React.useMemo(
    () => ({
      canManage,
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
        reset: () => {
          setSearchTerm('');
          setStatusFilter('all');
          setFilters((prev) => ({ ...prev, page: 1, search: undefined, status: 'all' }));
        },
      },
      status: {
        value: statusFilter,
        setValue: (value) => {
          setStatusFilter(value);
          setFilters((prev) => ({ ...prev, page: 1, status: value }));
        },
      },
    }),
    [canManage, searchTerm, statusFilter],
  );

  const pagination: PaginationController = React.useMemo(
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

  const table = useReactTable({
    data: items,
    columns: createSupplierColumns({
      canManage,
      pendingActions: pending,
      onEdit: (supplier) => {
        setSheetState({ mode: 'edit', isOpen: true, current: supplier });
        setSupplierForm(mapSupplierToFormState(supplier));
        setSupplierErrors({});
      },
      onToggleStatus: async (supplier) => {
        const nextStatus = !supplier.is_active;
        setPending((prev) => ({ ...prev, [supplier.id]: 'toggle' }));
        try {
          await updateSupplierMutation.mutateAsync({
            supplierId: supplier.id,
            payload: { isActive: nextStatus },
          });
          toast.success(nextStatus ? 'Supplier diaktifkan' : 'Supplier dinonaktifkan');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Gagal memperbarui status';
          toast.error(message);
        } finally {
          setPending((prev) => {
            const next = { ...prev };
            delete next[supplier.id];
            return next;
          });
        }
      },
      onDelete: (supplier) => {
        setDeleteDialog({ target: supplier, isOpen: true });
      },
      onManageCatalog: (supplier) => {
        setCatalogState({ supplier, mode: 'create', currentItem: null, isOpen: true });
        setCatalogForm(createDefaultCatalogFormState());
        setCatalogErrors({});
      },
    }),
    state: {
      sorting,
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.pageSize,
      },
    },
    onSortingChange: setSorting,
    manualPagination: true,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: filters.page - 1, pageSize: filters.pageSize })
          : updater;
      setFilters((prev) => ({
        ...prev,
        page: next.pageIndex + 1,
        pageSize: next.pageSize,
      }));
    },
  });

  React.useEffect(() => {
    table.setPageIndex(filters.page - 1);
  }, [filters.page, table]);

  const supplierFormController: FormController<SupplierFormState, SupplierFormErrors> = {
    values: supplierForm,
    errors: supplierErrors,
    setValue: (key, value) => {
      setSupplierForm((prev) => ({ ...prev, [key]: value }));
      setSupplierErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    clearError: (key) => {
      setSupplierErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
  };

  const sheetMode = sheetState.mode;
  const sheetCurrent = sheetState.current;

  const handleSubmitSupplier = React.useCallback(async () => {
    if (sheetMode === 'create') {
      const result = buildCreateSupplierInput(supplierForm);
      if (!result.success) {
        setSupplierErrors(result.errors);
        return;
      }
      setSupplierErrors({});
      try {
        await createSupplierMutation.mutateAsync(result.payload);
        toast.success('Supplier berhasil dibuat');
        setSheetState({ mode: 'create', isOpen: false, current: null });
        setSupplierForm(createDefaultSupplierFormState());
        setFilters((prev) => ({ ...prev, page: 1 }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal menyimpan supplier';
        toast.error(message);
      }
    } else if (sheetCurrent) {
      const result = buildUpdateSupplierInput(supplierForm, sheetCurrent);
      if (!result.success) {
        setSupplierErrors(result.errors);
        return;
      }
      setSupplierErrors({});
      const supplierId = sheetCurrent.id;
      setPending((prev) => ({ ...prev, [supplierId]: 'update' }));
      try {
        await updateSupplierMutation.mutateAsync({ supplierId, payload: result.payload });
        toast.success('Supplier diperbarui');
        setSheetState({ mode: 'create', isOpen: false, current: null });
        setSupplierForm(createDefaultSupplierFormState());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memperbarui supplier';
        toast.error(message);
      } finally {
        setPending((prev) => {
          const next = { ...prev };
          delete next[supplierId];
          return next;
        });
      }
    }
  }, [
    sheetMode,
    sheetCurrent,
    supplierForm,
    createSupplierMutation,
    updateSupplierMutation,
    setFilters,
  ]);

  const sheet: SheetController = {
    mode: sheetState.mode,
    isOpen: sheetState.isOpen,
    isSubmitting:
      sheetState.mode === 'create'
        ? createSupplierMutation.isPending
        : updateSupplierMutation.isPending,
    form: supplierFormController,
    openCreate: () => {
      setSheetState({ mode: 'create', isOpen: true, current: null });
      setSupplierForm(createDefaultSupplierFormState());
      setSupplierErrors({});
    },
    openEdit: (supplier) => {
      setSheetState({ mode: 'edit', isOpen: true, current: supplier });
      setSupplierForm(mapSupplierToFormState(supplier));
      setSupplierErrors({});
    },
    onOpenChange: (next) => {
      setSheetState((prev) => ({ ...prev, isOpen: next }));
      if (!next) {
        setSupplierForm(createDefaultSupplierFormState());
        setSupplierErrors({});
      }
    },
    submit: handleSubmitSupplier,
  };

  const deletion: DeletionController = {
    target: deleteDialog.target,
    isOpen: deleteDialog.isOpen,
    isDeleting: deleteSupplierMutation.isPending,
    open: (supplier) => setDeleteDialog({ target: supplier, isOpen: true }),
    close: () => setDeleteDialog({ target: null, isOpen: false }),
    confirm: async () => {
      if (!deleteDialog.target) return;
      const supplierId = deleteDialog.target.id;
      setPending((prev) => ({ ...prev, [supplierId]: 'delete' }));
      try {
        await deleteSupplierMutation.mutateAsync(supplierId);
        toast.success('Supplier dihapus');
        setDeleteDialog({ target: null, isOpen: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal menghapus supplier';
        toast.error(message);
      } finally {
        setPending((prev) => {
          const next = { ...prev };
          delete next[supplierId];
          return next;
        });
      }
    },
  };

  const catalogFormController: FormController<CatalogFormState, CatalogFormErrors> = {
    values: catalogForm,
    errors: catalogErrors,
    setValue: (key, value) => {
      setCatalogForm((prev) => ({ ...prev, [key]: value }));
      setCatalogErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    clearError: (key) => {
      setCatalogErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
  };

  const handleSubmitCatalog = React.useCallback(async () => {
    if (!catalogState.supplier) return;
    if (catalogState.mode === 'create') {
      const result = buildCreateCatalogItemInput(catalogState.supplier.id, catalogForm);
      if (!result.success) {
        setCatalogErrors(result.errors);
        return;
      }
      setCatalogErrors({});
      try {
        await createCatalogMutation.mutateAsync(result.payload);
        toast.success('Item katalog ditambahkan');
        setCatalogForm(createDefaultCatalogFormState());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal menyimpan item';
        toast.error(message);
      }
    } else if (catalogState.currentItem) {
      const result = buildUpdateCatalogItemInput(
        catalogState.supplier.id,
        catalogForm,
        catalogState.currentItem,
      );
      if (!result.success) {
        setCatalogErrors(result.errors);
        return;
      }
      setCatalogErrors({});
      try {
        await updateCatalogMutation.mutateAsync({
          catalogItemId: catalogState.currentItem.id,
          payload: result.payload,
        });
        toast.success('Item katalog diperbarui');
        setCatalogState((prev) => ({ ...prev, mode: 'create', currentItem: null }));
        setCatalogForm(createDefaultCatalogFormState());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memperbarui item';
        toast.error(message);
      }
    }
  }, [
    catalogState.supplier,
    catalogState.mode,
    catalogState.currentItem,
    catalogForm,
    createCatalogMutation,
    updateCatalogMutation,
  ]);

  const catalog: CatalogController = {
    isOpen: catalogState.isOpen,
    supplier: catalogState.supplier,
    items: catalogQuery.data ?? [],
    isLoading: catalogQuery.isLoading,
    isMutating:
      createCatalogMutation.isPending ||
      updateCatalogMutation.isPending ||
      toggleCatalogMutation.isPending ||
      deleteCatalogMutation.isPending,
    mode: catalogState.mode,
    form: catalogFormController,
    open: (supplier) => {
      setCatalogState({ supplier, mode: 'create', currentItem: null, isOpen: true });
      setCatalogForm(createDefaultCatalogFormState());
      setCatalogErrors({});
    },
    close: () => {
      setCatalogState({ supplier: null, mode: 'create', currentItem: null, isOpen: false });
      setCatalogForm(createDefaultCatalogFormState());
      setCatalogErrors({});
    },
    submit: handleSubmitCatalog,
    editItem: (item) => {
      setCatalogState((prev) => ({ ...prev, mode: 'edit', currentItem: item }));
      setCatalogForm(mapCatalogItemToFormState(item));
      setCatalogErrors({});
    },
    resetForm: () => {
      setCatalogState((prev) => ({ ...prev, mode: 'create', currentItem: null }));
      setCatalogForm(createDefaultCatalogFormState());
      setCatalogErrors({});
    },
    toggleItem: async (item) => {
      try {
        await toggleCatalogMutation.mutateAsync({
          catalogItemId: item.id,
          isActive: !item.is_active,
        });
        toast.success('Status item diperbarui');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memperbarui status item';
        toast.error(message);
      }
    },
    deleteItem: async (item) => {
      try {
        await deleteCatalogMutation.mutateAsync(item.id);
        toast.success('Item katalog dihapus');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal menghapus item';
        toast.error(message);
      }
    },
  };

  const isInitialLoading = suppliersQuery.status === 'pending' && !suppliersQuery.data;

  return {
    table,
    isLoading: isInitialLoading,
    isSyncing: suppliersQuery.isFetching,
    toolbar,
    pagination,
    sheet,
    deletion,
    catalog,
    refetch: () => suppliersQuery.refetch(),
    pending,
  };
}
