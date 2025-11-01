"use client";

import * as React from "react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import type { Table } from "@tanstack/react-table";
import { toast } from "sonner";

import { createStoreIngredientColumns } from "./columns";
import {
  buildUpdateStoreIngredientInput,
  createDefaultStoreIngredientFormState,
  mapStoreIngredientToFormState,
  type StoreIngredientFormErrors,
  type StoreIngredientFormState,
} from "./forms/state";
import type { StoreIngredientFilters } from "./forms/schema";
import {
  useStoreIngredients,
  useStoreIngredientsRealtime,
  useUpdateStoreIngredientMutation,
} from "./queries";
import type { StoreIngredientListItem } from "../../types";

export type StoreIngredientsTableOptions = {
  initialItems: StoreIngredientListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      search: string | null;
      status: "all" | "active" | "inactive";
      lowStockOnly: boolean;
    };
  };
  canManage: boolean;
};

type ToolbarState = {
  search: {
    term: string;
    setTerm: (value: string) => void;
    apply: () => void;
  };
  status: {
    value: "all" | "active" | "inactive";
    setValue: (value: "all" | "active" | "inactive") => void;
  };
  lowStock: {
    value: boolean;
    toggle: () => void;
  };
  canManage: boolean;
  reset: () => void;
};

type PaginationController = {
  page: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

type EditDialogController = {
  isOpen: boolean;
  ingredient: StoreIngredientListItem | null;
  form: {
    values: StoreIngredientFormState;
    errors: StoreIngredientFormErrors;
    setValue: <TKey extends keyof StoreIngredientFormState>(
      key: TKey,
      value: StoreIngredientFormState[TKey],
    ) => void;
    clearError: (key: keyof StoreIngredientFormErrors) => void;
  };
  open: (ingredient: StoreIngredientListItem) => void;
  close: () => void;
  submit: () => Promise<void>;
  isSubmitting: boolean;
};

type TableState = {
  table: Table<StoreIngredientListItem>;
  isLoading: boolean;
  isSyncing: boolean;
  toolbar: ToolbarState;
  pagination: PaginationController;
  editDialog: EditDialogController;
  refetch: () => void;
};

export function useStoreIngredientsTableViewModel({
  initialItems,
  initialMeta,
  canManage,
}: StoreIngredientsTableOptions): TableState {
  const [searchTerm, setSearchTerm] = React.useState(
    initialMeta.filters.search ?? "",
  );
  const [statusFilter, setStatusFilter] = React.useState<
    ToolbarState["status"]["value"]
  >(initialMeta.filters.status ?? "all");
  const [lowStockOnly, setLowStockOnly] = React.useState(
    Boolean(initialMeta.filters.lowStockOnly),
  );
  const [filters, setFilters] = React.useState<StoreIngredientFilters>({
    page: initialMeta.pagination.page,
    pageSize: initialMeta.pagination.pageSize,
    status: initialMeta.filters.status ?? "all",
    search: initialMeta.filters.search ?? undefined,
    lowStockOnly: initialMeta.filters.lowStockOnly ?? false,
  });

  const [editState, setEditState] = React.useState(() =>
    createDefaultStoreIngredientFormState(),
  );
  const [editErrors, setEditErrors] = React.useState<StoreIngredientFormErrors>(
    {},
  );
  const [editingIngredient, setEditingIngredient] = React.useState<
    StoreIngredientListItem | null
  >(null);
  const [isEditOpen, setEditOpen] = React.useState(false);

  const ingredientsQuery = useStoreIngredients(filters, {
    initialData: {
      items: initialItems,
      meta: {
        pagination: initialMeta.pagination,
        filters: initialMeta.filters,
      },
    },
  });

  useStoreIngredientsRealtime({ enabled: true });

  const items = ingredientsQuery.data?.items ?? initialItems;
  const paginationMeta =
    ingredientsQuery.data?.meta?.pagination ?? initialMeta.pagination;

  const pageCount = React.useMemo(() => {
    const total = paginationMeta.total ?? items.length;
    const size = Math.max(1, paginationMeta.pageSize ?? filters.pageSize);
    return Math.max(1, Math.ceil(total / size));
  }, [filters.pageSize, items.length, paginationMeta.pageSize, paginationMeta.total]);

  const columns = React.useMemo(
    () =>
      createStoreIngredientColumns({
        canManage,
        onEdit: (ingredient) => {
          setEditingIngredient(ingredient);
          setEditState(mapStoreIngredientToFormState(ingredient));
          setEditErrors({});
          setEditOpen(true);
        },
      }),
    [canManage],
  );

  const table = useReactTable({
    data: items,
    columns,
    manualPagination: true,
    pageCount,
    state: {
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.pageSize,
      },
    },
    onPaginationChange: (updater) => {
      setFilters((prev) => {
        const current: PaginationState = {
          pageIndex: prev.page - 1,
          pageSize: prev.pageSize,
        };
        const next =
          typeof updater === "function" ? updater(current) : updater;
        return {
          ...prev,
          page: next.pageIndex + 1,
          pageSize: next.pageSize,
        };
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const toolbar = React.useMemo<ToolbarState>(() => {
    const applySearch = () => {
      setFilters((prev) => ({
        ...prev,
        page: 1,
        search: searchTerm.trim() ? searchTerm.trim() : undefined,
      }));
    };

    const updateStatus = (value: "all" | "active" | "inactive") => {
      setStatusFilter(value);
      setFilters((prev) => ({
        ...prev,
        page: 1,
        status: value,
      }));
    };

    const toggleLowStock = () => {
      setLowStockOnly((prevValue) => !prevValue);
      setFilters((prev) => ({
        ...prev,
        page: 1,
        lowStockOnly: !prev.lowStockOnly,
      }));
    };

    const reset = () => {
      setSearchTerm("");
      setStatusFilter("all");
      setLowStockOnly(false);
      setFilters((prev) => ({
        ...prev,
        page: 1,
        search: undefined,
        status: "all",
        lowStockOnly: false,
      }));
    };

    return {
      search: {
        term: searchTerm,
        setTerm: setSearchTerm,
        apply: applySearch,
      },
      status: {
        value: statusFilter,
        setValue: updateStatus,
      },
      lowStock: {
        value: lowStockOnly,
        toggle: toggleLowStock,
      },
      canManage,
      reset,
    } satisfies ToolbarState;
  }, [canManage, lowStockOnly, searchTerm, statusFilter]);

  const pagination = React.useMemo<PaginationController>(
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

  const updateMutation = useUpdateStoreIngredientMutation();

  const editDialog = React.useMemo<EditDialogController>(() => ({
    isOpen: isEditOpen,
    ingredient: editingIngredient,
    form: {
      values: editState,
      errors: editErrors,
      setValue: (key, value) => {
        setEditState((prev) => ({ ...prev, [key]: value }));
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
    open: (ingredient) => {
      setEditingIngredient(ingredient);
      setEditState(mapStoreIngredientToFormState(ingredient));
      setEditErrors({});
      setEditOpen(true);
    },
    close: () => {
      setEditOpen(false);
      setEditingIngredient(null);
      setEditErrors({});
      setEditState(createDefaultStoreIngredientFormState());
    },
    submit: async () => {
      if (!editingIngredient) return;
      const result = buildUpdateStoreIngredientInput(
        editState,
        editingIngredient,
      );
      if (!result.success) {
        setEditErrors(result.errors);
        return;
      }

      try {
        await updateMutation.mutateAsync({
          ingredientId: editingIngredient.id,
          payload: result.payload,
        });
        toast.success("Bahan berhasil diperbarui");
        setEditOpen(false);
        setEditingIngredient(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Gagal memperbarui bahan";
        toast.error(message);
      }
    },
    isSubmitting: updateMutation.isPending,
  }), [editErrors, editState, editingIngredient, isEditOpen, updateMutation]);

  const isLoading = ingredientsQuery.isLoading;
  const isSyncing = ingredientsQuery.isFetching && !ingredientsQuery.isLoading;

  return {
    table,
    isLoading,
    isSyncing,
    toolbar,
    pagination,
    editDialog,
    refetch: () => ingredientsQuery.refetch(),
  };
}
