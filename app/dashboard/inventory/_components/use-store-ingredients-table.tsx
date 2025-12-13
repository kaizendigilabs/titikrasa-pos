"use client";

import * as React from "react";
import { toast } from "sonner";

import type { DataTableRenderContext } from "@/components/tables/data-table";
import {
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
} from "@/components/tables/use-data-table-state";
import type { DataTableToolbarProps } from "@/components/tables/data-table-toolbar";
import { createStoreIngredientColumns } from "../columns";
import {
  useStoreIngredients,
  useCreateStoreIngredientMutation,
  useUpdateStoreIngredientMutation,
  useDeleteStoreIngredientMutation,
} from "@/features/inventory/store-ingredients/hooks";
import type {
  CreateStoreIngredientInput,
  StoreIngredientFilters,
  UpdateStoreIngredientInput,
} from "@/features/inventory/store-ingredients/schemas";
import type { StoreIngredientListItem } from "@/features/inventory/store-ingredients/types";
import type { StoreIngredientListResult } from "@/features/inventory/store-ingredients/client";
import type { StoreIngredientFormValues } from "./edit-sheet";
import type { StoreIngredientCreateValues } from "./create-dialog";
import { Button } from "@/components/ui/button";

export type StoreIngredientsTableFilters = PaginationFilters & {
  status: "all" | "active" | "inactive";
  search: string;
  stockLevel: "all" | "low" | "high";
};

export type UseStoreIngredientsTableControllerArgs = {
  initialItems: StoreIngredientListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: "all" | "active" | "inactive";
      search: string | null;
      stockLevel: "all" | "low" | "high";
    };
  };
  canManage: boolean;
};

export type StoreIngredientsTableControllerResult = {
  columns: ReturnType<typeof createStoreIngredientColumns>;
  initialFilters: StoreIngredientsTableFilters;
  initialData: DataTableQueryResult<StoreIngredientListItem>;
  queryHook: DataTableQueryHook<
    StoreIngredientListItem,
    StoreIngredientsTableFilters
  >;
  getRowId: (row: StoreIngredientListItem) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<
      StoreIngredientListItem,
      StoreIngredientsTableFilters
    >,
  ) => DataTableToolbarProps;
  createDialogProps?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: StoreIngredientCreateValues) => Promise<void>;
    isSubmitting: boolean;
  };
  editDialogProps?: {
    ingredient: StoreIngredientListItem | null;
    isSubmitting: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: StoreIngredientFormValues) => Promise<void>;
  };
};

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function useStoreIngredientsDataTableQuery(
  filters: StoreIngredientsTableFilters,
  options?: { initialData?: DataTableQueryResult<StoreIngredientListItem> },
) {
  const queryFilters: StoreIngredientFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
    ...(filters.search.trim().length > 0
      ? { search: filters.search.trim() }
      : {}),
    stockLevel: filters.stockLevel,
  };

  const hookOptions = options?.initialData
    ? {
        initialData: {
          items: options.initialData.items,
          meta: options.initialData.meta as StoreIngredientListResult["meta"],
        },
      }
    : undefined;

  return useStoreIngredients(queryFilters, hookOptions);
}

export function useStoreIngredientsTableController({
  initialItems,
  initialMeta,
  canManage,
}: UseStoreIngredientsTableControllerArgs): StoreIngredientsTableControllerResult {
  const initialFilters = React.useMemo<StoreIngredientsTableFilters>(
    () => ({
      page: initialMeta.pagination.page,
      pageSize: initialMeta.pagination.pageSize,
      status: initialMeta.filters.status,
      search: initialMeta.filters.search ?? "",
      stockLevel: initialMeta.filters.stockLevel ?? "all",
    }),
    [initialMeta],
  );

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingIngredient, setEditingIngredient] = React.useState<StoreIngredientListItem | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const createMutation = useCreateStoreIngredientMutation();
  const updateMutation = useUpdateStoreIngredientMutation();
  const deleteMutation = useDeleteStoreIngredientMutation();

  const handleDelete = React.useCallback(
    async (ingredient: StoreIngredientListItem) => {
      if (!confirm(`Hapus ingredient "${ingredient.name}"?`)) return;
      setDeletingId(ingredient.id);
      try {
        await deleteMutation.mutateAsync(ingredient.id);
        toast.success("Ingredient deleted");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete ingredient";
        toast.error(message);
      } finally {
        setDeletingId(null);
      }
    },
    [deleteMutation],
  );

  const columns = React.useMemo(
    () =>
      createStoreIngredientColumns({
        onEdit: canManage ? setEditingIngredient : undefined,
        onDelete: canManage ? handleDelete : undefined,
        canManage,
        isDeleting: (row) => deletingId === row.id,
      }),
    [canManage, handleDelete, deletingId],
  );

  const queryHook = useStoreIngredientsDataTableQuery;




  const handleSubmitCreate = React.useCallback(
    async (values: StoreIngredientCreateValues) => {
      const minStock = Number.parseInt(values.minStock, 10);
      const payload: CreateStoreIngredientInput = {
        name: values.name.trim(),
        baseUom: values.baseUom as CreateStoreIngredientInput["baseUom"],
        minStock: Number.isFinite(minStock) ? minStock : 0,
        sku: values.sku?.trim() ?? "",
      };
      try {
        await createMutation.mutateAsync(payload);
        toast.success("Ingredient created");
        setCreateOpen(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create ingredient";
        toast.error(message);
      }
    },
    [createMutation],
  );

  const handleSubmitEdit = React.useCallback(
    async (values: StoreIngredientFormValues) => {
      if (!editingIngredient) return;
      try {
        const minStockNumber = Number.parseInt(values.minStock, 10);
        const payload: UpdateStoreIngredientInput = {
          sku: values.sku,
          minStock: Number.isFinite(minStockNumber) ? minStockNumber : 0,
          isActive: values.isActive,
        };

        await updateMutation.mutateAsync({
          ingredientId: editingIngredient.id,
          payload,
        });
        toast.success("Ingredient updated");
        setEditingIngredient(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update ingredient";
        toast.error(message);
      }
    },
    [editingIngredient, updateMutation],
  );

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<
        StoreIngredientListItem,
        StoreIngredientsTableFilters
      >,
    ): DataTableToolbarProps => {
      const showReset =
        context.filters.search.trim().length > 0 ||
        context.filters.status !== "all" ||
        context.filters.stockLevel !== "all";

      return {
        search: {
          value: context.filters.search,
          onChange: (value) => context.updateFilters({ search: value }),
          placeholder: "Search name or SKU",
          disabled: context.isSyncing,
        },
        filters: [
          {
            type: "select",
            id: "status-filter",
            value: context.filters.status,
            onValueChange: (value) =>
              context.updateFilters({
                status: (value ?? "all") as StoreIngredientsTableFilters["status"],
              }),
            options: STATUS_OPTIONS,
            placeholder: "Status",
            disabled: context.isSyncing,
          },
          {
            type: "select",
            id: "stock-level",
            value: context.filters.stockLevel,
            onValueChange: (value) =>
              context.updateFilters({
                stockLevel: (value ?? "all") as StoreIngredientsTableFilters["stockLevel"],
              }),
            options: [
              { label: "All Stock", value: "all" },
              { label: "Low Stock", value: "low" },
              { label: "High Stock", value: "high" },
            ],
            placeholder: "Stock Level",
            disabled: context.isSyncing,
          },
        ],
        reset: {
          visible: showReset,
          onReset: () =>
            context.updateFilters(
              () => ({
                ...context.filters,
                search: "",
                status: "all",
                stockLevel: "all",
              }),
              { resetPage: true },
            ),
          disabled: context.isSyncing,
        },
        status: {
          isSyncing: context.isSyncing,
        },
        primaryAction: canManage ? (
          <Button onClick={() => setCreateOpen(true)} disabled={context.isSyncing}>
            Add Ingredient
          </Button>
        ) : undefined,
      };
    },
    [canManage],
  );

  return {
    columns,
    initialFilters,
    initialData: {
      items: initialItems,
      meta: {
        pagination: initialMeta.pagination,
        filters: initialMeta.filters,
      },
    },
    queryHook,
    getRowId: (row) => row.id,
    buildToolbarConfig,
    createDialogProps: canManage
      ? {
          open: createOpen,
          onOpenChange: setCreateOpen,
          onSubmit: handleSubmitCreate,
          isSubmitting: createMutation.isPending,
        }
      : undefined,
    editDialogProps: canManage
      ? {
          ingredient: editingIngredient,
          isSubmitting: updateMutation.isPending,
          onOpenChange: (open) => {
            if (!open) {
              setEditingIngredient(null);
            }
          },
          onSubmit: handleSubmitEdit,
        }
      : undefined,
  };
}
