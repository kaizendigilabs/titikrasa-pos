'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { UseQueryResult } from '@tanstack/react-query';
import { IconPlus } from "@tabler/icons-react";
import { toast } from 'sonner';

import type { DataTableRenderContext } from '@/components/tables/data-table';
import {
  type DataTableQueryHook,
  type DataTableQueryResult,
  type PaginationFilters,
} from '@/components/tables/use-data-table-state';
import type { DataTableToolbarProps } from '@/components/tables/data-table-toolbar';
import { Button } from '@/components/ui/button';

import { createRecipeColumns } from '../columns';
import {
  useCreateRecipeMutation,
  useDeleteRecipeMutation,
  useRecipes,
  useUpdateRecipeMutation,
} from '@/features/recipes/hooks';
import type { RecipeFilters, RecipeListItem } from '@/features/recipes/types';
import type { RecipeInput } from '@/features/recipes/client';

export type UseRecipesTableControllerArgs = {
  initialRecipes: RecipeListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { search: string | null; menuId: string | null };
  };
  menus: Array<{ id: string; name: string }>;
  ingredients: Array<{ id: string; name: string; baseUom: string }>;
  canManage: boolean;
};

export type RecipesTableFilters = PaginationFilters & {
  search: string;
  menuId: string;
};

type DeleteDialogState = {
  recipe: RecipeListItem;
} | null;

export type RecipesTableControllerResult = {
  columns: ColumnDef<RecipeListItem, unknown>[];
  initialFilters: RecipesTableFilters;
  initialData: DataTableQueryResult<RecipeListItem>;
  queryHook: DataTableQueryHook<RecipeListItem, RecipesTableFilters>;
  getRowId: (row: RecipeListItem) => string;
  buildToolbarConfig: (
    context: DataTableRenderContext<RecipeListItem, RecipesTableFilters>,
  ) => DataTableToolbarProps;
  detail: {
    recipe: RecipeListItem | null;
    canManage: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
  };
  formDialogProps: {
    open: boolean;
    mode: 'create' | 'edit';
    recipe: RecipeListItem | null;
    menus: Array<{ id: string; name: string }>;
    ingredients: Array<{ id: string; name: string; baseUom: string }>;
    isSubmitting: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (input: RecipeInput) => Promise<void>;
  };
  deleteDialog: {
    state: DeleteDialogState;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
    isPending: boolean;
  };
};

export function useRecipesTableController({
  initialRecipes,
  initialMeta,
  menus,
  ingredients,
  canManage,
}: UseRecipesTableControllerArgs): RecipesTableControllerResult {
  const [detailRecipe, setDetailRecipe] = React.useState<RecipeListItem | null>(null);
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<'create' | 'edit'>('create');
  const [editingRecipe, setEditingRecipe] = React.useState<RecipeListItem | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<DeleteDialogState>(null);
  const [pendingActions, setPendingActions] = React.useState<Record<string, 'delete'>>({});

  const createMutation = useCreateRecipeMutation();
  const updateMutation = useUpdateRecipeMutation();
  const deleteMutation = useDeleteRecipeMutation();

  const queryHook = useRecipesDataTableQuery;

  const initialFilters = React.useMemo<RecipesTableFilters>(() => {
    return {
      page: initialMeta.pagination.page ?? 1,
      pageSize: initialMeta.pagination.pageSize ?? 50,
      search: initialMeta.filters.search ?? '',
      menuId: initialMeta.filters.menuId ?? 'all',
    };
  }, [initialMeta]);

  const initialData = React.useMemo<DataTableQueryResult<RecipeListItem>>(
    () => ({
      items: initialRecipes,
      meta: initialMeta,
    }),
    [initialMeta, initialRecipes],
  );

  const columns = React.useMemo(
    () =>
      createRecipeColumns({
        onView: (recipe) => setDetailRecipe(recipe),
        onEdit: (recipe) => {
          if (!canManage) return;
          setFormMode('edit');
          setEditingRecipe(recipe);
          setFormOpen(true);
        },
        onDelete: (recipe) => {
          if (!canManage) return;
          setDeleteDialog({ recipe });
        },
        pendingActions,
        canManage,
      }),
    [canManage, pendingActions],
  );

  const closeForm = React.useCallback(() => {
    setFormOpen(false);
    setEditingRecipe(null);
  }, []);

  const handleFormSubmit = React.useCallback(
    async (payload: RecipeInput) => {
      try {
        if (formMode === 'create') {
          await createMutation.mutateAsync(payload);
          toast.success('Recipe created');
        } else if (editingRecipe) {
          await updateMutation.mutateAsync({
            recipeId: editingRecipe.id,
            input: payload,
          });
          toast.success('Recipe updated');
          setDetailRecipe((prev) =>
            prev && prev.id === editingRecipe.id ? null : prev,
          );
        }
        closeForm();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save recipe',
        );
      }
    },
    [closeForm, createMutation, editingRecipe, formMode, updateMutation],
  );

  const handleDeleteRecipe = React.useCallback(async () => {
    if (!deleteDialog) return;
    const recipeId = deleteDialog.recipe.id;
    setPendingActions((prev) => ({ ...prev, [recipeId]: 'delete' }));
    try {
      await deleteMutation.mutateAsync(recipeId);
      toast.success('Recipe deleted');
      if (detailRecipe?.id === recipeId) {
        setDetailRecipe(null);
      }
      setDeleteDialog(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete recipe',
      );
    } finally {
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[recipeId];
        return next;
      });
    }
  }, [deleteDialog, deleteMutation, detailRecipe]);

  const buildToolbarConfig = React.useCallback(
    (
      context: DataTableRenderContext<RecipeListItem, RecipesTableFilters>,
    ): DataTableToolbarProps => {
      const showReset =
        context.filters.search.trim().length > 0 ||
        context.filters.menuId !== 'all';

      return {
        search: {
          value: context.filters.search,
          onChange: (value) =>
            context.updateFilters({ search: value }, { resetPage: true }),
          placeholder: 'Search recipes',
          disabled: context.isSyncing,
        },
        filters: [
          {
            type: 'select',
            id: 'menu-filter',
            value: context.filters.menuId,
            onValueChange: (value) =>
              context.updateFilters(
                { menuId: value as RecipesTableFilters['menuId'] },
                { resetPage: true },
              ),
            options: [
              { label: 'All menus', value: 'all' },
              ...menus.map((menu) => ({
                label: menu.name,
                value: menu.id,
              })),
            ],
            placeholder: 'Menus',
            disabled: context.isSyncing,
          },
        ],
        reset: {
          visible: showReset,
          onReset: () =>
            context.updateFilters(
              {
                search: '',
                menuId: 'all',
              },
              { resetPage: true },
            ),
          disabled: context.isSyncing,
        },
        status: {
          isSyncing: context.isSyncing,
        },
        primaryAction:
          canManage && menus.length > 0 ? (
            <Button onClick={() => {
              setFormMode('create');
              setEditingRecipe(null);
              setFormOpen(true);
            }}>
              <IconPlus className="mr-2 h-4 w-4" />
              Add Recipe
            </Button>
          ) : undefined,
      };
    },
    [canManage, menus],
  );

  return {
    columns,
    initialFilters,
    initialData,
    queryHook,
    getRowId: (row) => row.id,
    buildToolbarConfig,
    detail: {
      recipe: detailRecipe,
      onClose: () => setDetailRecipe(null),
      onEdit: () => {
        if (!detailRecipe || !canManage) return;
        setDetailRecipe(null);
        setFormMode('edit');
        setEditingRecipe(detailRecipe);
        setFormOpen(true);
      },
      onDelete: () => {
        if (!detailRecipe || !canManage) return;
        setDetailRecipe(null);
        setDeleteDialog({ recipe: detailRecipe });
      },
      canManage,
    },
    formDialogProps: {
      open: isFormOpen,
      mode: formMode,
      recipe: editingRecipe,
      menus,
      ingredients,
      isSubmitting: createMutation.isPending || updateMutation.isPending,
      onOpenChange: (open) => {
        if (!open) {
          closeForm();
        } else {
          setFormOpen(true);
        }
      },
      onSubmit: handleFormSubmit,
    },
    deleteDialog: {
      state: deleteDialog,
      onConfirm: handleDeleteRecipe,
      onCancel: () => setDeleteDialog(null),
      isPending: deleteMutation.isPending,
    },
  };
}

export function useRecipesDataTableQuery(
  filters: RecipesTableFilters,
  options?: { initialData?: DataTableQueryResult<RecipeListItem> },
) {
  const queryFilters: RecipeFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
    ...(filters.search.trim().length > 0
      ? { search: filters.search.trim() }
      : {}),
    ...(filters.menuId !== 'all' ? { menuId: filters.menuId } : {}),
  };

  const hookOptions = options?.initialData
    ? {
        initialData: {
          recipes: options.initialData.items,
          meta: options.initialData.meta ?? null,
        },
      }
    : undefined;

  const result = useRecipes(queryFilters, hookOptions);

  return {
    ...result,
    data: result.data
      ? {
          items: result.data.recipes,
          meta: result.data.meta ?? null,
        }
      : undefined,
  } as unknown as UseQueryResult<DataTableQueryResult<RecipeListItem>>;
}


