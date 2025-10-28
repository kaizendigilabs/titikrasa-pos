'use client';

import * as React from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react';
import { toast } from 'sonner';

import { createCategoryColumns } from './columns';
import { DataTableContent } from '@/components/tables/data-table-content';
import { DataTablePagination } from '@/components/tables/data-table-pagination';
import { DataTableSelectFilter } from '@/components/tables/data-table-select-filter';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useCreateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useMenuCategories,
  useMenuCategoriesRealtime,
  useUpdateMenuCategoryMutation,
} from '@/features/menu-categories/hooks';
import type { MenuCategory, MenuCategoryFilters } from '@/features/menu-categories/types';

type CategoriesTableProps = {
  initialItems: MenuCategory[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      status: 'all' | 'active' | 'inactive';
      search: string | null;
    };
  };
  canManage: boolean;
};

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | 'active' | 'inactive' }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
];

type CategoryFormState = {
  name: string;
  slug: string;
  sortOrder: string;
  iconUrl: string;
  isActive: boolean;
};

const DEFAULT_FORM: CategoryFormState = {
  name: '',
  slug: '',
  sortOrder: '',
  iconUrl: '',
  isActive: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function CategoriesTable({
  initialItems,
  initialMeta,
  canManage,
}: CategoriesTableProps) {
  const [searchTerm, setSearchTerm] = React.useState(initialMeta.filters.search ?? '');
  const [status, setStatus] = React.useState<'all' | 'active' | 'inactive'>(
    initialMeta.filters.status,
  );
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'sort_order', desc: false },
  ]);
  const [filters, setFilters] = React.useState<MenuCategoryFilters>(() => ({
    search: initialMeta.filters.search ?? null,
    status: initialMeta.filters.status ?? 'all',
  }));

  const categoriesQuery = useMenuCategories(filters, {
    initialData: {
      items: initialItems,
      meta: initialMeta
        ? {
            pagination: initialMeta.pagination,
            filters: initialMeta.filters,
          }
        : null,
    },
  });

  useMenuCategoriesRealtime(filters);

  const items = categoriesQuery.data?.items ?? initialItems;

  const [pending, setPending] = React.useState<
    Record<string, 'toggle' | 'delete' | 'update'>
  >({});
  const [formState, setFormState] = React.useState<CategoryFormState>(DEFAULT_FORM);
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'create' | 'edit'>('create');
  const [editing, setEditing] = React.useState<MenuCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MenuCategory | null>(null);

  const createMutation = useCreateMenuCategoryMutation(filters);
  const updateMutation = useUpdateMenuCategoryMutation(filters);
  const deleteMutation = useDeleteMenuCategoryMutation(filters);

  const isLoading = categoriesQuery.isFetching;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetForm = React.useCallback(() => {
    setFormState(DEFAULT_FORM);
    setEditing(null);
    setMode('create');
  }, []);

  const openCreate = React.useCallback(() => {
    resetForm();
    setSheetOpen(true);
  }, [resetForm]);

  const handleOpenEdit = React.useCallback((category: MenuCategory) => {
    setMode('edit');
    setEditing(category);
    setFormState({
      name: category.name,
      slug: category.slug,
      sortOrder: category.sort_order != null ? String(category.sort_order) : '',
      iconUrl: category.icon_url ?? '',
      isActive: category.is_active,
    });
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = React.useCallback((next: boolean) => {
    if (!next) {
      resetForm();
    }
    setSheetOpen(next);
  }, [resetForm]);

  const updatePending = React.useCallback(
    (categoryId: string, state?: 'toggle' | 'delete' | 'update') => {
      setPending((prev) => {
        const next = { ...prev };
        if (!state) {
          delete next[categoryId];
          return next;
        }
        next[categoryId] = state;
        return next;
      });
    },
    [],
  );

  const handleToggleStatus = React.useCallback(
    async (category: MenuCategory) => {
      if (!canManage) return;
      updatePending(category.id, 'toggle');
      try {
        await updateMutation.mutateAsync({
          categoryId: category.id,
          input: { isActive: !category.is_active },
        });
        toast.success(
          `${category.name} kini ${
            !category.is_active ? 'aktif' : 'nonaktif'
          }`,
        );
      } catch (error) {
        console.error('[MENU_CATEGORIES_TOGGLE_ERROR]', error);
        toast.error('Gagal memperbarui status kategori');
      } finally {
        updatePending(category.id);
      }
    },
    [canManage, updateMutation, updatePending],
  );

  const handleConfirmDelete = React.useCallback((category: MenuCategory) => {
    setDeleteTarget(category);
  }, []);

  const handleDeleteCategory = React.useCallback(async () => {
    const target = deleteTarget;
    if (!target) return;
    updatePending(target.id, 'delete');
    try {
      await deleteMutation.mutateAsync(target.id);
      toast.success(`Kategori ${target.name} dihapus`);
    } catch (error) {
      console.error('[MENU_CATEGORIES_DELETE_ERROR]', error);
      toast.error(
        error instanceof Error ? error.message : 'Gagal menghapus kategori',
      );
    } finally {
      updatePending(target.id);
      setDeleteTarget(null);
    }
  }, [deleteMutation, deleteTarget, updatePending]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManage) return;
      const payload = {
        name: formState.name.trim(),
        slug: formState.slug.trim(),
        sortOrder: formState.sortOrder
          ? Number(formState.sortOrder)
          : undefined,
        iconUrl: formState.iconUrl?.trim()
          ? formState.iconUrl.trim()
          : null,
        isActive: formState.isActive,
      };
    updatePending(editing?.id ?? 'new', 'update');
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
        toast.success('Kategori baru dibuat');
      } else if (editing) {
        await updateMutation.mutateAsync({
          categoryId: editing.id,
          input: payload,
        });
        toast.success('Kategori diperbarui');
      }
      handleSheetOpenChange(false);
      } catch (error) {
        console.error('[MENU_CATEGORIES_SAVE_ERROR]', error);
        toast.error(
          error instanceof Error ? error.message : 'Gagal menyimpan kategori',
        );
      } finally {
        updatePending(editing?.id ?? 'new');
    }
    },
    [
      canManage,
      createMutation,
      editing,
      formState.iconUrl,
      formState.isActive,
      formState.name,
      formState.slug,
      formState.sortOrder,
      mode,
      updateMutation,
      updatePending,
      handleSheetOpenChange,
    ],
  );

  const columns = React.useMemo<ColumnDef<MenuCategory>[]>(() => {
    return createCategoryColumns({
      onEdit: handleOpenEdit,
      onToggle: handleToggleStatus,
      onDelete: handleConfirmDelete,
      pending,
      canManage,
    });
  }, [canManage, pending, handleOpenEdit, handleToggleStatus, handleConfirmDelete]);

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

  const handleNameBlur = React.useCallback(() => {
    if (mode === 'create' && !formState.slug.trim()) {
      setFormState((prev) => ({
        ...prev,
        slug: slugify(prev.name),
      }));
    }
  }, [formState.slug, mode]);

  const handleApplySearch = React.useCallback(() => {
    setFilters((prev) => {
      const nextSearch = searchTerm.trim() ? searchTerm.trim() : null;
      if (prev.search === nextSearch) {
        return prev;
      }
      return {
        ...prev,
        search: nextSearch,
      };
    });
  }, [searchTerm]);

  React.useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      status,
    }));
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari kategori"
              className="pl-9"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleApplySearch();
                }
              }}
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleApplySearch}
            disabled={isLoading}
          >
            Cari
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => categoriesQuery.refetch()}
            disabled={isLoading}
          >
            <IconRefresh
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <DataTableSelectFilter
            value={status}
            onValueChange={setStatus}
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
          {canManage ? (
            <Button onClick={openCreate}>
              <IconPlus className="mr-2 h-4 w-4" />
              Tambah Kategori
            </Button>
          ) : null}
        </div>
      </div>
      <DataTableContent table={table} />
      <DataTablePagination table={table} />

      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {mode === 'create' ? 'Tambah Kategori Menu' : 'Edit Kategori Menu'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nama</Label>
              <Input
                id="category-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                onBlur={handleNameBlur}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug</Label>
              <Input
                id="category-slug"
                value={formState.slug}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    slug: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-sort">Urutan</Label>
              <Input
                id="category-sort"
                type="number"
                min={0}
                value={formState.sortOrder}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    sortOrder: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-icon">Ikon URL</Label>
              <Input
                id="category-icon"
                value={formState.iconUrl}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    iconUrl: event.target.value,
                  }))
                }
                placeholder="https://"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="category-active" className="text-sm font-medium">
                  Status Aktif
                </Label>
                <p className="text-xs text-muted-foreground">
                  Jika nonaktif, kategori tidak tampil di POS
                </p>
              </div>
              <Button
                id="category-active"
                type="button"
                variant={formState.isActive ? 'default' : 'secondary'}
                onClick={() =>
                  setFormState((prev) => ({
                    ...prev,
                    isActive: !prev.isActive,
                  }))
                }
              >
                {formState.isActive ? 'Aktif' : 'Nonaktif'}
              </Button>
            </div>
            <SheetFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mode === 'create' ? 'Simpan' : 'Perbarui'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteTarget != null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori {deleteTarget?.name} akan dihapus. Pastikan tidak ada menu
              yang masih menggunakan kategori ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTarget ? pending[deleteTarget.id] === 'delete' : false}
            >
              {deleteTarget && pending[deleteTarget.id] === 'delete' ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
