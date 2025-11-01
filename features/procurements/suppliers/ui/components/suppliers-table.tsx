'use client';

import * as React from 'react';
import { IconPlus, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react';

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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useSuppliersTableViewModel } from '../../model/view-model';
import type { SupplierListItem } from '../../types';
import { SupplierForm } from './supplier-form';
import { SupplierCatalogSheet } from './supplier-catalog-sheet';

type SuppliersTableScreenProps = {
  initialItems: SupplierListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { search: string | null; status: 'all' | 'active' | 'inactive' };
  } | null;
  canManage: boolean;
};

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | 'active' | 'inactive' }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
];

export function SuppliersTableScreen(props: SuppliersTableScreenProps) {
  const vm = useSuppliersTableViewModel(props);

  const handleDeleteDialogChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        vm.deletion.close();
      }
    },
    [vm],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={vm.toolbar.search.term}
              onChange={(event) => vm.toolbar.search.setTerm(event.target.value)}
              placeholder="Cari supplier"
              className="w-[220px] pl-9"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  vm.toolbar.search.apply();
                }
              }}
            />
          </div>
          <Button variant="secondary" onClick={vm.toolbar.search.apply} disabled={vm.isLoading}>
            Cari
          </Button>
          <Button variant="ghost" size="icon" onClick={() => vm.refetch()} disabled={vm.isSyncing}>
            <IconRefresh className={vm.isSyncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DataTableSelectFilter
            value={vm.toolbar.status.value}
            onValueChange={vm.toolbar.status.setValue}
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
          <Button variant="outline" onClick={vm.toolbar.search.reset}>
            <IconTrash className="mr-2 h-4 w-4" />
            Bersihkan
          </Button>
          {vm.toolbar.canManage ? (
            <Button onClick={vm.sheet.openCreate}>
              <IconPlus className="mr-2 h-4 w-4" />
              Tambah supplier
            </Button>
          ) : null}
        </div>
      </div>

      <DataTableContent table={vm.table} isLoading={vm.isLoading} />
      <DataTablePagination table={vm.table} />

      <Sheet open={vm.sheet.isOpen} onOpenChange={vm.sheet.onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="space-y-1">
            <SheetTitle>
              {vm.sheet.mode === 'create' ? 'Tambah supplier baru' : 'Perbarui supplier'}
            </SheetTitle>
            {vm.sheet.mode === 'edit' && vm.sheet.form.values.name ? (
              <p className="text-sm text-muted-foreground">
                Supplier {vm.sheet.form.values.name}
              </p>
            ) : null}
          </SheetHeader>

          <div className="mt-6">
            <SupplierForm
              mode={vm.sheet.mode}
              form={vm.sheet.form}
              isSubmitting={vm.sheet.isSubmitting}
              onSubmit={vm.sheet.submit}
              onCancel={() => vm.sheet.onOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={vm.deletion.isOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              {vm.deletion.target
                ? `Supplier ${vm.deletion.target.name} akan dihapus secara permanen.`
                : 'Supplier akan dihapus secara permanen.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={vm.deletion.close}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={vm.deletion.confirm} disabled={vm.deletion.isDeleting}>
              {vm.deletion.isDeleting ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SupplierCatalogSheet controller={vm.catalog} />
    </div>
  );
}
