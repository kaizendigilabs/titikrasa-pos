'use client';

import * as React from 'react';
import {
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { useMenuCategoriesTableViewModel } from '../../model/view-model';
import type { MenuCategory } from '../../types';
import { MenuCategoryForm } from './menu-category-form';

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | 'active' | 'inactive' }> = [
  { label: 'Semua status', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
];

type MenuCategoriesTableProps = {
  initialItems: MenuCategory[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { status: 'all' | 'active' | 'inactive'; search: string | null };
  } | null;
  canManage: boolean;
};

export function MenuCategoriesTableScreen(props: MenuCategoriesTableProps) {
  const vm = useMenuCategoriesTableViewModel(props);

  const handleSearchKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        vm.toolbar.search.apply();
      }
    },
    [vm.toolbar.search],
  );

  const handleSheetChange = React.useCallback(
    (next: boolean) => {
      vm.sheet.onOpenChange(next);
    },
    [vm.sheet],
  );

  const handleDeleteDialogChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        vm.deletion.close();
      }
    },
    [vm.deletion],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <div className="relative w-full sm:w-64">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={vm.toolbar.search.term}
              onChange={(event) => vm.toolbar.search.setTerm(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Cari kategori menu"
              className="pl-9"
            />
          </div>
          <Button
            variant="secondary"
            onClick={vm.toolbar.search.apply}
            disabled={vm.isLoading}
          >
            Cari
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={vm.refetch}
            disabled={vm.isLoading}
          >
            <IconRefresh className={vm.isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DataTableSelectFilter
            value={vm.toolbar.status.value}
            onValueChange={(value) =>
              vm.toolbar.status.setValue(value as 'all' | 'active' | 'inactive')
            }
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
          {vm.toolbar.canManage ? (
            <Button onClick={vm.sheet.openCreate}>
              <IconPlus className="mr-2 h-4 w-4" />
              Tambah kategori
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {vm.isSyncing ? (
          <span className="inline-flex items-center gap-2">
            <IconLoader2 className="h-3 w-3 animate-spin" /> Data sedang diperbarui…
          </span>
        ) : (
          <span>{vm.pagination.total} kategori terdaftar</span>
        )}

        {vm.toolbar.search.term || vm.toolbar.status.value !== 'all' ? (
          <Button variant="ghost" size="sm" onClick={vm.toolbar.search.reset}>
            Reset filter
          </Button>
        ) : null}
      </div>

      <DataTableContent table={vm.table} isLoading={vm.isLoading} />
      <DataTablePagination table={vm.table} />

      <Sheet open={vm.sheet.isOpen} onOpenChange={handleSheetChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {vm.sheet.mode === 'create'
                ? 'Tambah kategori menu'
                : 'Edit kategori menu'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <MenuCategoryForm
              mode={vm.sheet.mode}
              values={vm.sheet.form.values}
              errors={vm.sheet.form.errors}
              isSubmitting={vm.sheet.isSubmitting}
              onChange={vm.sheet.form.setValue}
              onCancel={() => vm.sheet.onOpenChange(false)}
              onSubmit={vm.sheet.submit}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={vm.deletion.isOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori akan dihapus dari daftar. Pastikan tidak ada menu aktif yang
              masih menggunakan kategori ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={vm.deletion.confirm}
              disabled={vm.deletion.isPending}
            >
              {vm.deletion.isPending ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconTrash className="mr-2 h-4 w-4" />
              )}
              {vm.deletion.isPending ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
