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

import { createMenuColumns } from './columns';
import {
  MenuForm,
  createDefaultMenuFormValues,
  mapMenuToFormValues,
  type MenuFormSubmitPayload,
  type MenuFormValues,
} from './MenuForm';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useCreateMenuMutation,
  useDeleteMenuMutation,
  useMenus,
  useMenusRealtime,
  useToggleMenuStatusMutation,
  useUpdateMenuMutation,
} from '@/features/menus/hooks';
import type { MenuFilters, MenuListItem } from '@/features/menus/types';

type MenusTableProps = {
  initialItems: MenuListItem[];
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

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | 'active' | 'inactive' }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
];

const TYPE_OPTIONS: Array<{ label: string; value: 'all' | 'simple' | 'variant' }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Simple', value: 'simple' },
  { label: 'Variant', value: 'variant' },
];

export function MenusTable({
  initialItems,
  initialMeta,
  categories,
  canManage,
}: MenusTableProps) {
  const [searchTerm, setSearchTerm] = React.useState(initialMeta.filters.search ?? '');
  const [status, setStatus] = React.useState<'all' | 'active' | 'inactive'>(
    initialMeta.filters.status,
  );
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'simple' | 'variant'>(
    initialMeta.filters.type,
  );
  const [categoryFilter, setCategoryFilter] = React.useState<string>(
    initialMeta.filters.categoryId ?? 'all',
  );
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'name', desc: false },
  ]);
  const [filters, setFilters] = React.useState<MenuFilters>(() => ({
    status: initialMeta.filters.status,
    type: initialMeta.filters.type,
    categoryId: initialMeta.filters.categoryId,
    search: initialMeta.filters.search,
  }));

  const menusQuery = useMenus(filters, {
    initialData: {
      items: initialItems,
      meta: initialMeta,
    },
  });

  useMenusRealtime(filters);

  const items = menusQuery.data?.items ?? initialItems;

  const [pending, setPending] = React.useState<
    Record<string, 'toggle' | 'delete' | 'update'>
  >({});
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'create' | 'edit'>('create');
  const [currentMenu, setCurrentMenu] = React.useState<MenuListItem | null>(null);
  const [formValues, setFormValues] = React.useState<MenuFormValues>(
    createDefaultMenuFormValues(),
  );
  const [deleteTarget, setDeleteTarget] = React.useState<MenuListItem | null>(null);

  const createMutation = useCreateMenuMutation(filters);
  const updateMutation = useUpdateMenuMutation(filters);
  const deleteMutation = useDeleteMenuMutation(filters);
  const toggleMutation = useToggleMenuStatusMutation(filters);

  const isLoading = menusQuery.isFetching;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const updatePending = React.useCallback(
    (menuId: string, state?: 'toggle' | 'delete' | 'update') => {
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

  const openCreate = React.useCallback(() => {
    setMode('create');
    setCurrentMenu(null);
    setFormValues(createDefaultMenuFormValues());
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = React.useCallback((menu: MenuListItem) => {
    setMode('edit');
    setCurrentMenu(menu);
    setFormValues(mapMenuToFormValues(menu));
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = React.useCallback((next: boolean) => {
    if (!next) {
      setCurrentMenu(null);
      setFormValues(createDefaultMenuFormValues());
    }
    setSheetOpen(next);
  }, []);

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
        console.error('[MENUS_TABLE_TOGGLE_ERROR]', error);
        toast.error('Gagal memperbarui status menu');
      } finally {
        updatePending(menu.id);
      }
    },
    [canManage, toggleMutation, updatePending],
  );

  const handleConfirmDelete = React.useCallback((menu: MenuListItem) => {
    setDeleteTarget(menu);
  }, []);

  const handleDeleteMenu = React.useCallback(async () => {
    const target = deleteTarget;
    if (!target) return;
    updatePending(target.id, 'delete');
    try {
      await deleteMutation.mutateAsync(target.id);
      toast.success(`Menu ${target.name} berhasil dihapus`);
    } catch (error) {
      console.error('[MENUS_TABLE_DELETE_ERROR]', error);
      toast.error(
        error instanceof Error ? error.message : 'Gagal menghapus menu',
      );
    } finally {
      updatePending(target.id);
      setDeleteTarget(null);
    }
  }, [deleteMutation, deleteTarget, updatePending]);

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
          console.error('[MENUS_TABLE_CREATE_ERROR]', error);
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
        console.error('[MENUS_TABLE_UPDATE_ERROR]', error);
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

  const columns = React.useMemo<ColumnDef<MenuListItem>[]>(() => {
    return createMenuColumns({
      onEdit: handleOpenEdit,
      onToggleStatus: handleToggleStatus,
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

  const handleApplySearch = React.useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchTerm.trim() ? searchTerm.trim() : null,
    }));
  }, [searchTerm]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari menu"
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
            Cari
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => menusQuery.refetch()}
            disabled={isLoading}
          >
            <IconRefresh
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataTableSelectFilter
            value={status}
            onValueChange={setStatus}
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
          <DataTableSelectFilter
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={TYPE_OPTIONS}
            placeholder="Tipe"
          />
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kategori</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage ? (
            <Button onClick={openCreate}>
              <IconPlus className="mr-2 h-4 w-4" />
              Tambah Menu
            </Button>
          ) : null}
        </div>
      </div>

      <DataTableContent table={table} />
      <DataTablePagination table={table} />

      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader className="space-y-1">
            <SheetTitle>
              {mode === 'create' ? 'Tambah Menu Baru' : 'Edit Menu'}
            </SheetTitle>
            {mode === 'edit' && currentMenu ? (
              <p className="text-sm text-muted-foreground">
                Dibuat pada {new Date(currentMenu.created_at).toLocaleString('id-ID')}
              </p>
            ) : null}
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <MenuForm
              mode={mode}
              initialValues={formValues}
              categories={categories}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmitMenu}
              onCancel={() => handleSheetOpenChange(false)}
            />

            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Integrasi Resep</p>
              <p>
                Resep akan terhubung ke menu ini melalui modul Recipes.
                Saat ini belum ada resep aktif yang di-link. Gunakan halaman
                Recipes untuk menyusun bahan & SOP, lalu assign ke menu ini.
              </p>
            </div>
          </div>
          <SheetFooter />
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteTarget != null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Menu</AlertDialogTitle>
            <AlertDialogDescription>
              Menu {deleteTarget?.name} akan dihapus permanen. Pastikan tidak
              ada transaksi berjalan yang menggunakan menu ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMenu}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                deleteTarget ? pending[deleteTarget.id] === 'delete' : false
              }
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
