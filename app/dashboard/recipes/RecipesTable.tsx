'use client';

import * as React from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { IconEye, IconPencil, IconPlus, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { RecipeForm } from './RecipeForm';
import { DataTableContent } from '@/components/data-table/table-content';
import { DataTablePagination } from '@/components/data-table/pagination';
import { DataTableSelectFilter } from '@/components/data-table/select-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useCreateRecipeMutation,
  useDeleteRecipeMutation,
  useRecipes,
  useRecipesRealtime,
  useUpdateRecipeMutation,
} from '@/features/recipes/hooks';
import { mapRecipeToFormValues } from '@/features/recipes/utils';
import type { RecipeInput } from '@/features/recipes/client';
import type { RecipeFilters, RecipeListItem } from '@/features/recipes/types';
import { formatNumber } from '@/lib/utils/formatters';

type RecipesTableProps = {
  initialRecipes: RecipeListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      search: string | null;
      menuId: string | null;
    };
  };
  menus: Array<{ id: string; name: string }>;
  ingredients: Array<{ id: string; name: string; baseUom: string }>;
  canManage: boolean;
};

const MENU_FILTER_ALL = 'all';

type MenuFilterOption = {
  label: string;
  value: string;
};

type RecipeDetailState = {
  recipe: RecipeListItem;
  open: boolean;
};

const DEFAULT_DETAIL_STATE: RecipeDetailState | null = null;

export function RecipesTable({ initialRecipes, initialMeta, menus, ingredients, canManage }: RecipesTableProps) {
  const [searchTerm, setSearchTerm] = React.useState(initialMeta.filters.search ?? '');
  const [menuFilter, setMenuFilter] = React.useState<string>(initialMeta.filters.menuId ?? MENU_FILTER_ALL);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'menuName', desc: false },
  ]);
  const [detail, setDetail] = React.useState<RecipeDetailState | null>(DEFAULT_DETAIL_STATE);
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<'create' | 'edit'>('create');
  const [editingRecipe, setEditingRecipe] = React.useState<RecipeListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<RecipeListItem | null>(null);

  const filters = React.useMemo<RecipeFilters>(() => ({
    search: initialMeta.filters.search ?? null,
    menuId: initialMeta.filters.menuId ?? null,
  }), [initialMeta.filters.menuId, initialMeta.filters.search]);

  const [queryFilters, setQueryFilters] = React.useState<RecipeFilters>(filters);

  const recipesQuery = useRecipes(queryFilters, {
    initialData: {
      recipes: initialRecipes,
      meta: initialMeta,
    },
  });

  useRecipesRealtime(queryFilters);

  const items = recipesQuery.data?.recipes ?? initialRecipes;
  const createMutation = useCreateRecipeMutation(queryFilters);
  const updateMutation = useUpdateRecipeMutation(queryFilters);
  const deleteMutation = useDeleteRecipeMutation(queryFilters);
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const handleOpenDetail = React.useCallback((recipe: RecipeListItem) => {
    setDetail({ recipe, open: true });
  }, []);

  const closeDetail = React.useCallback(() => {
    setDetail(DEFAULT_DETAIL_STATE);
  }, []);

  const handleOpenCreate = React.useCallback(() => {
    setFormMode('create');
    setEditingRecipe(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = React.useCallback((recipe: RecipeListItem) => {
    setFormMode('edit');
    setEditingRecipe(recipe);
    setFormOpen(true);
  }, []);

  const handleCloseForm = React.useCallback(() => {
    setFormOpen(false);
    setEditingRecipe(null);
  }, []);

  const handleSubmitForm = React.useCallback(
    async (input: RecipeInput) => {
      try {
        if (formMode === 'create') {
          await createMutation.mutateAsync(input);
          toast.success('Recipe created');
        } else if (editingRecipe) {
          await updateMutation.mutateAsync({ recipeId: editingRecipe.id, input });
          toast.success('Recipe updated');
          closeDetail();
        }
        handleCloseForm();
      } catch (error) {
        console.error('[RECIPES_FORM_SUBMIT_ERROR]', error);
        toast.error(error instanceof Error ? error.message : 'Failed to save recipe');
      }
    },
    [formMode, editingRecipe, createMutation, updateMutation, handleCloseForm, closeDetail],
  );

  const handleDeleteRecipe = React.useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Recipe deleted');
      setDeleteTarget(null);
      if (detail?.recipe.id === deleteTarget.id) {
        closeDetail();
      }
    } catch (error) {
      console.error('[RECIPES_DELETE_ERROR]', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete recipe');
    }
  }, [deleteTarget, deleteMutation, detail, closeDetail]);

  const columns = React.useMemo<ColumnDef<RecipeListItem>[]>(() => {
    return [
      {
        accessorKey: 'menuName',
        header: 'Menu',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-sm text-foreground">{row.original.menuName}</span>
            <span className="text-xs text-muted-foreground">Version {row.original.version}</span>
          </div>
        ),
      },
      {
        id: 'ingredientsCount',
        header: 'Ingredients',
        accessorFn: (row) => row.items.length,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.items.length}</span>
        ),
        sortingFn: (a, b) => a.original.items.length - b.original.items.length,
      },
      {
        accessorKey: 'effectiveFrom',
        header: 'Effective Date',
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {format(new Date(row.original.effectiveFrom), 'dd MMM yyyy')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenDetail(row.original)}
              aria-label={`View recipe for ${row.original.menuName}`}
            >
              <IconEye className="h-4 w-4" />
            </Button>
            {canManage ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenEdit(row.original)}
                aria-label={`Edit recipe for ${row.original.menuName}`}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ];
  }, [canManage, handleOpenDetail, handleOpenEdit]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  const isLoading = recipesQuery.isFetching;

  const menuOptions: MenuFilterOption[] = React.useMemo(
    () => [
      { label: 'All Menus', value: MENU_FILTER_ALL },
      ...menus.map((menu) => ({ label: menu.name, value: menu.id })),
    ],
    [menus],
  );

  const handleApplySearch = React.useCallback(() => {
    setQueryFilters((prev) => ({
      ...prev,
      search: searchTerm.trim() ? searchTerm.trim() : null,
    }));
  }, [searchTerm]);

  React.useEffect(() => {
    setQueryFilters((prev) => ({
      ...prev,
      menuId: menuFilter === MENU_FILTER_ALL ? null : menuFilter,
    }));
  }, [menuFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search recipes"
              className="pl-9"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleApplySearch();
                }
              }}
            />
          </div>
          <Button variant="secondary" onClick={handleApplySearch} disabled={isLoading}>
            Search
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => recipesQuery.refetch()}
            disabled={isLoading}
            aria-label="Refresh recipes"
          >
            <IconRefresh className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <DataTableSelectFilter
            value={menuFilter}
            onValueChange={setMenuFilter}
            options={menuOptions}
            placeholder="Filter menu"
            className="w-40"
          />
          {canManage ? (
            <Button onClick={handleOpenCreate} disabled={menus.length === 0}>
              <IconPlus className="mr-2 h-4 w-4" />
              Add Recipe
            </Button>
          ) : null}
        </div>
      </div>

      <DataTableContent table={table} />
      <DataTablePagination table={table} />

      <Sheet open={detail?.open ?? false} onOpenChange={(open) => (open ? null : closeDetail())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {detail?.recipe ? (
            <RecipeDetail
              recipe={detail.recipe}
              canManage={canManage}
              onEdit={() => {
                closeDetail();
                handleOpenEdit(detail.recipe);
              }}
              onDelete={() => setDeleteTarget(detail.recipe)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={isFormOpen} onOpenChange={(open) => (open ? null : handleCloseForm())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader className="space-y-1">
            <SheetTitle>{formMode === 'create' ? 'Create Recipe' : 'Edit Recipe'}</SheetTitle>
            <SheetDescription>
              Update recipe details, ingredients, and method steps for the selected menu item.
            </SheetDescription>
          </SheetHeader>

          <RecipeForm
            mode={formMode}
            menus={menus}
            ingredients={ingredients}
            loading={isSaving}
            onSubmit={handleSubmitForm}
            onCancel={handleCloseForm}
            initialValues={editingRecipe ? mapRecipeToFormValues(editingRecipe) : null}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recipe</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete recipe for
              {' '}<span className="font-medium">{deleteTarget?.menuName}</span>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecipe}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type RecipeDetailProps = {
  recipe: RecipeListItem;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function RecipeDetail({ recipe, canManage, onEdit, onDelete }: RecipeDetailProps) {
  return (
    <div className="flex h-full flex-col gap-6">
      <SheetHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <SheetTitle>{recipe.menuName}</SheetTitle>
            <SheetDescription>
              Version {recipe.version} · Effective {format(new Date(recipe.effectiveFrom), 'dd MMM yyyy')}
            </SheetDescription>
          </div>
          {canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <IconPencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <IconTrash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      </SheetHeader>

      <Tabs defaultValue="ingredients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="method">Method</TabsTrigger>
          <TabsTrigger value="overrides">Variant Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="space-y-4">
          {recipe.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ingredients registered for this recipe.</p>
          ) : (
            <ul className="space-y-2">
              {recipe.items.map((item) => (
                <li
                  key={`${item.ingredientId}-${item.uom}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-foreground">
                      {item.ingredientName ?? 'Unnamed ingredient'}
                    </span>
                    <span className="text-xs text-muted-foreground">ID: {item.ingredientId}</span>
                  </div>
                  <Badge variant="secondary">
                    {formatNumber(item.quantity, 3)} {item.uom || 'unit'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="method" className="space-y-3">
          {recipe.methodSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No method steps documented.</p>
          ) : (
            <ol className="space-y-3">
              {recipe.methodSteps.map((step) => (
                <li key={step.step_no} className="rounded-md border p-3">
                  <p className="font-medium text-sm text-foreground">Step {step.step_no}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {step.instruction}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="overrides" className="space-y-3">
          {recipe.overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No variant overrides recorded.</p>
          ) : (
            <div className="space-y-4">
              {recipe.overrides.map((override) => (
                <div key={`${override.size}-${override.temperature}`} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Size: {override.size.toUpperCase()}</Badge>
                    <Badge variant="outline">Temp: {override.temperature.toUpperCase()}</Badge>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {override.items.map((item) => (
                      <li key={`${item.ingredientId}-${item.uom}`} className="flex items-center justify-between text-sm">
                        <span>{item.ingredientName ?? item.ingredientId}</span>
                        <span className="text-muted-foreground">
                          {formatNumber(item.quantity, 3)} {item.uom || 'unit'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
