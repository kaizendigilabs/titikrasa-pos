'use client';

import * as React from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import type { Table } from '@tanstack/react-table';
import { toast } from 'sonner';

import { createResellerColumns } from './columns';
import {
  useCreateResellerMutation,
  useDeleteResellerMutation,
  useResellers,
  useResellersRealtime,
  useToggleResellerStatusMutation,
  useUpdateResellerMutation,
} from './queries';
import {
  buildCreateResellerInput,
  buildUpdateResellerInput,
  createDefaultResellerFormState,
  mapResellerToFormState,
  type ResellerFormErrors,
  type ResellerFormState,
} from './forms/state';
import type { ResellerFilters } from './forms/schema';
import type { ResellerListItem } from '../types';

export type ResellersTableViewModelOptions = {
  initialItems: ResellerListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { search: string | null; status: 'all' | 'active' | 'inactive' };
  };
  canManage: boolean;
};

type PendingState = Record<string, 'toggle' | 'delete' | 'update'>;

type DeleteDialogState = {
  target: ResellerListItem | null;
  isOpen: boolean;
};

type SheetState = {
  mode: 'create' | 'edit';
  isOpen: boolean;
};

type TableFiltersState = {
  search: string | null;
  status: 'all' | 'active' | 'inactive';
};

type ExposedFormState = {
  values: ResellerFormState;
  errors: ResellerFormErrors;
  setValue: <TKey extends keyof ResellerFormState>(
    key: TKey,
    value: ResellerFormState[TKey],
  ) => void;
  clearError: (key: keyof ResellerFormErrors) => void;
};

type SheetController = {
  mode: 'create' | 'edit';
  isOpen: boolean;
  isSubmitting: boolean;
  current: ResellerListItem | null;
  form: ExposedFormState;
  openCreate: () => void;
  openEdit: (reseller: ResellerListItem) => void;
  onOpenChange: (next: boolean) => void;
  submit: () => Promise<void>;
};

type DeletionController = {
  target: ResellerListItem | null;
  isOpen: boolean;
  open: (reseller: ResellerListItem) => void;
  close: () => void;
  confirm: () => Promise<void>;
  isPending: boolean;
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

type PaginationController = {
  page: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

type ToolbarState = {
  search: SearchController;
  status: StatusController;
  canManage: boolean;
};

type TableState = {
  table: Table<ResellerListItem>;
  isLoading: boolean;
  isSyncing: boolean;
  refetch: () => void;
  toolbar: ToolbarState;
  sheet: SheetController;
  deletion: DeletionController;
  pending: PendingState;
  pagination: PaginationController;
};

export function useResellersTableViewModel({
  initialItems,
  initialMeta,
  canManage,
}: ResellersTableViewModelOptions): TableState {
  const [searchTerm, setSearchTerm] = React.useState(
    initialMeta.filters.search ?? '',
  );
  const [statusFilter, setStatusFilter] = React.useState<
    TableFiltersState['status']
  >(initialMeta.filters.status ?? 'all');
  const [filters, setFilters] = React.useState<ResellerFilters>({
    page: initialMeta.pagination.page,
    pageSize: initialMeta.pagination.pageSize,
    search: initialMeta.filters.search ?? undefined,
    status: initialMeta.filters.status ?? 'all',
  });
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [sheetState, setSheetState] = React.useState<SheetState>({
    mode: 'create',
    isOpen: false,
  });
  const [currentReseller, setCurrentReseller] =
    React.useState<ResellerListItem | null>(null);
  const [createForm, setCreateForm] = React.useState<ResellerFormState>(
    createDefaultResellerFormState(),
  );
  const [createErrors, setCreateErrors] = React.useState<ResellerFormErrors>({});
  const [editForm, setEditForm] = React.useState<ResellerFormState>(
    createDefaultResellerFormState(),
  );
  const [editErrors, setEditErrors] = React.useState<ResellerFormErrors>({});
  const [deleteDialog, setDeleteDialog] = React.useState<DeleteDialogState>({
    target: null,
    isOpen: false,
  });
  const [pending, setPending] = React.useState<PendingState>({});

  const searchController = React.useMemo<SearchController>(
    () => ({
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
        setFilters((prev) => ({
          ...prev,
          page: 1,
          search: undefined,
          status: 'all',
        }));
      },
    }),
    [searchTerm],
  );

  const statusController = React.useMemo<StatusController>(
    () => ({
      value: statusFilter,
      setValue: (value) => {
        setStatusFilter(value);
        setFilters((prev) => ({
          ...prev,
          page: 1,
          status: value,
        }));
      },
    }),
    [statusFilter],
  );

  const resellersQuery = useResellers(filters, {
    initialData: {
      items: initialItems,
      meta: {
        pagination: initialMeta.pagination,
        filters: initialMeta.filters,
      },
    },
  });

  useResellersRealtime(true);

  const items = resellersQuery.data?.items ?? initialItems;
  const meta = resellersQuery.data?.meta ?? null;
  const paginationMeta = meta?.pagination ?? initialMeta.pagination;

  const pageCount = React.useMemo(() => {
    const total = paginationMeta.total ?? items.length;
    const size = Math.max(1, paginationMeta.pageSize ?? filters.pageSize);
    return Math.max(1, Math.ceil(total / size));
  }, [paginationMeta.pageSize, paginationMeta.total, items.length, filters.pageSize]);

  const paginationController = React.useMemo<PaginationController>(
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
    [filters.page, filters.pageSize, paginationMeta.total, items.length],
  );

  const createMutation = useCreateResellerMutation();
  const updateMutation = useUpdateResellerMutation();
  const toggleMutation = useToggleResellerStatusMutation();
  const deleteMutation = useDeleteResellerMutation();

  const clearPending = React.useCallback((id: string) => {
    setPending((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const columns = React.useMemo(
    () =>
      createResellerColumns({
        canManage,
        pendingActions: pending,
        onEdit: (reseller) => {
          setCurrentReseller(reseller);
          setEditForm(mapResellerToFormState(reseller));
          setEditErrors({});
          setSheetState({ mode: 'edit', isOpen: true });
        },
        onToggleStatus: async (reseller) => {
          const nextStatus = !reseller.is_active;
          setPending((prev) => ({ ...prev, [reseller.id]: 'toggle' }));
          try {
            await toggleMutation.mutateAsync({
              resellerId: reseller.id,
              isActive: nextStatus,
            });
            toast.success(
              nextStatus ? 'Reseller activated' : 'Reseller deactivated',
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to update status';
            toast.error(message);
          } finally {
            clearPending(reseller.id);
          }
        },
        onDelete: (reseller) => {
          setDeleteDialog({ target: reseller, isOpen: true });
        },
      }),
    [canManage, pending, toggleMutation, clearPending],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.pageSize,
      },
    },
    manualPagination: true,
    pageCount,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({
              pageIndex: filters.page - 1,
              pageSize: filters.pageSize,
            })
          : updater;
      setFilters((prev) => ({
        ...prev,
        page: next.pageIndex + 1,
        pageSize: next.pageSize,
      }));
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  React.useEffect(() => {
    table.setPageIndex(filters.page - 1);
  }, [filters.page, table]);

  const resetSheet = React.useCallback(() => {
    setSheetState((prev) => ({ ...prev, isOpen: false }));
    setCurrentReseller(null);
    setCreateForm(createDefaultResellerFormState());
    setCreateErrors({});
    setEditErrors({});
  }, []);

  const handleCreateSubmit = React.useCallback(async () => {
    const result = buildCreateResellerInput(createForm);
    if (!result.success) {
      setCreateErrors(result.errors);
      return;
    }

    setCreateErrors({});
    try {
      await createMutation.mutateAsync(result.payload);
      toast.success('Reseller created');
      resetSheet();
      setFilters((prev) => ({ ...prev, page: 1 }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create reseller';
      toast.error(message);
    }
  }, [createForm, createMutation, resetSheet]);

  const handleEditSubmit = React.useCallback(async () => {
    if (!currentReseller) return;
    const result = buildUpdateResellerInput(editForm, currentReseller);
    if (!result.success) {
      setEditErrors(result.errors);
      return;
    }

    setEditErrors({});
    const resellerId = currentReseller.id;
    setPending((prev) => ({ ...prev, [resellerId]: 'update' }));
    try {
      await updateMutation.mutateAsync({
        resellerId,
        input: result.payload,
      });
      toast.success('Reseller updated');
      resetSheet();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update reseller';
      toast.error(message);
    } finally {
      clearPending(resellerId);
    }
  }, [currentReseller, editForm, updateMutation, resetSheet, clearPending]);

  const sheetController: SheetController = {
    mode: sheetState.mode,
    isOpen: sheetState.isOpen,
    isSubmitting:
      sheetState.mode === 'create'
        ? createMutation.isPending
        : updateMutation.isPending,
    current: currentReseller,
    form:
      sheetState.mode === 'create'
        ? {
            values: createForm,
            errors: createErrors,
            setValue: (key, value) => {
              setCreateForm((prev) => ({ ...prev, [key]: value }));
              setCreateErrors((prev) => {
                if (!(key in prev)) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
              });
            },
            clearError: (key) => {
              setCreateErrors((prev) => {
                if (!(key in prev)) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
              });
            },
          }
        : {
            values: editForm,
            errors: editErrors,
            setValue: (key, value) => {
              setEditForm((prev) => ({ ...prev, [key]: value }));
              setEditErrors((prev) => {
                if (!(key in prev)) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
              });
            },
            clearError: (key) => {
              setEditErrors((prev) => {
                if (!(key in prev)) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
              });
            },
          },
    openCreate: () => {
      setSheetState({ mode: 'create', isOpen: true });
      setCreateForm(createDefaultResellerFormState());
      setCreateErrors({});
      setCurrentReseller(null);
    },
    openEdit: (reseller) => {
      setCurrentReseller(reseller);
      setEditForm(mapResellerToFormState(reseller));
      setEditErrors({});
      setSheetState({ mode: 'edit', isOpen: true });
    },
    onOpenChange: (next) => {
      if (!next) {
        resetSheet();
      } else {
        setSheetState((prev) => ({ ...prev, isOpen: true }));
      }
    },
    submit: sheetState.mode === 'create' ? handleCreateSubmit : handleEditSubmit,
  };

  const deletionController: DeletionController = {
    target: deleteDialog.target,
    isOpen: deleteDialog.isOpen,
    open: (reseller) => {
      setDeleteDialog({ target: reseller, isOpen: true });
    },
    close: () => {
      setDeleteDialog({ target: null, isOpen: false });
    },
    confirm: async () => {
      const target = deleteDialog.target;
      if (!target) return;
      setPending((prev) => ({ ...prev, [target.id]: 'delete' }));
      try {
        await deleteMutation.mutateAsync(target.id);
        toast.success('Reseller deleted');
        setDeleteDialog({ target: null, isOpen: false });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to delete reseller';
        toast.error(message);
      } finally {
        clearPending(target.id);
      }
    },
    isPending: deleteMutation.isPending,
  };

  return {
    table,
    isLoading:
      resellersQuery.status === 'pending' && !resellersQuery.data,
    isSyncing: resellersQuery.isFetching,
    refetch: () => resellersQuery.refetch(),
    toolbar: {
      search: searchController,
      status: statusController,
      canManage,
    },
    sheet: sheetController,
    deletion: deletionController,
    pending,
    pagination: paginationController,
  };
}
