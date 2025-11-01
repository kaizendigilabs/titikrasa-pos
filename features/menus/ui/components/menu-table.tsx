'use client';

import * as React from 'react';
import {
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react';

import { DataTableContent } from '@/components/data-table/table-content';
import { DataTablePagination } from '@/components/data-table/pagination';
import { DataTableSelectFilter } from '@/components/data-table/select-filter';
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
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMenuTableViewModel } from '@/features/menus/model/view-model';
import type { MenuListItem } from '@/features/menus/types';

import { MenuForm } from './menu-form';

type MenuTableScreenProps = {
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

export function MenuTableScreen(props: MenuTableScreenProps) {
  const vm = useMenuTableViewModel(props);
  const { close: closeDeleteDialog } = vm.deletion;

  const handleDeleteDialogChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        closeDeleteDialog();
      }
    },
    [closeDeleteDialog],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={vm.search.term}
              onChange={(event) => vm.search.setTerm(event.target.value)}
              placeholder="Cari menu"
              className="pl-9"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  vm.search.apply();
                }
              }}
            />
          </div>
          <Button
            variant="secondary"
            onClick={vm.search.apply}
            disabled={vm.isLoading}
          >
            Cari
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => vm.refetch()}
            disabled={vm.isLoading}
          >
            <IconRefresh
              className={vm.isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DataTableSelectFilter
            value={vm.filters.status}
            onValueChange={vm.filters.setStatus}
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
          <DataTableSelectFilter
            value={vm.filters.type}
            onValueChange={vm.filters.setType}
            options={TYPE_OPTIONS}
            placeholder="Tipe"
          />
          <Select
            value={vm.filters.category}
            onValueChange={vm.filters.setCategory}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kategori</SelectItem>
              {vm.categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {vm.canManage ? (
            <Button onClick={vm.sheet.openCreate}>
              <IconPlus className="mr-2 h-4 w-4" />
              Tambah Menu
            </Button>
          ) : null}
        </div>
      </div>

      <DataTableContent table={vm.table} isLoading={vm.isLoading} />
      <DataTablePagination table={vm.table} />

      <Sheet open={vm.sheet.isOpen} onOpenChange={vm.sheet.onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader className="space-y-1">
            <SheetTitle>
              {vm.sheet.mode === 'create' ? 'Tambah Menu Baru' : 'Edit Menu'}
            </SheetTitle>
            {vm.sheet.mode === 'edit' && vm.sheet.currentMenu ? (
              <p className="text-sm text-muted-foreground">
                Dibuat pada{' '}
                {new Date(vm.sheet.currentMenu.created_at).toLocaleString('id-ID')}
              </p>
            ) : null}
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <MenuForm
              mode={vm.sheet.mode}
              initialValues={vm.sheet.initialValues}
              categories={vm.categories}
              isSubmitting={vm.sheet.isSubmitting}
              onSubmit={vm.sheet.onSubmit}
              onCancel={() => vm.sheet.onOpenChange(false)}
            />

            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Integrasi Resep</p>
              <p>
                Resep akan terhubung ke menu ini melalui modul Recipes. Saat ini belum
                ada resep aktif yang di-link. Gunakan halaman Recipes untuk menyusun
                bahan & SOP, lalu assign ke menu ini.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={vm.deletion.isOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus menu?</AlertDialogTitle>
            <AlertDialogDescription>
              {vm.deletion.target
                ? `Menu ${vm.deletion.target.name} akan dihapus permanen.`
                : 'Menu ini akan dihapus permanen.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={vm.deletion.close}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={vm.deletion.confirm} disabled={vm.deletion.isDeleting}>
              {vm.deletion.isDeleting ? (
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
