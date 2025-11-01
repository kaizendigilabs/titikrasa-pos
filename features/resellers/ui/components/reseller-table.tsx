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
import { AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { useResellersTableViewModel } from '@/features/resellers/model/view-model';
import type { ResellerListItem } from '@/features/resellers/types';

import { ResellerForm } from './reseller-form';

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | 'active' | 'inactive' }> = [
  { label: 'Semua status', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
];

type ResellersTableScreenProps = {
  initialItems: ResellerListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { search: string | null; status: 'all' | 'active' | 'inactive' };
  };
  canManage: boolean;
};

export function ResellersTableScreen(props: ResellersTableScreenProps) {
  const vm = useResellersTableViewModel(props);

  const handleDeleteDialogChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        vm.deletion.close();
      }
    },
    [vm],
  );

  const isSheetCreate = vm.sheet.mode === 'create';

  const formValues = vm.sheet.form.values;
  const formErrors = vm.sheet.form.errors;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <div className="relative w-full sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={vm.toolbar.search.term}
              onChange={(event) => vm.toolbar.search.setTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  vm.toolbar.search.apply();
                }
              }}
              placeholder="Cari reseller"
            />
          </div>
          <Button variant="secondary" onClick={vm.toolbar.search.apply}>
            Cari
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => vm.refetch()}
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
              Tambah reseller
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {vm.isSyncing ? (
          <span className="inline-flex items-center gap-1">
            <IconLoader2 className="h-3 w-3 animate-spin" />
            Menyinkronkan data…
          </span>
        ) : (
          <span>{vm.pagination.total} reseller terdata</span>
        )}
        {vm.toolbar.search.term || vm.toolbar.status.value !== 'all' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={vm.toolbar.search.reset}
            className="text-muted-foreground"
          >
            Reset filter
          </Button>
        ) : null}
      </div>

      <DataTableContent table={vm.table} isLoading={vm.isLoading} />
      <DataTablePagination table={vm.table} />

      <Sheet open={vm.sheet.isOpen} onOpenChange={vm.sheet.onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {isSheetCreate ? 'Tambah reseller baru' : 'Edit data reseller'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ResellerForm
              mode={vm.sheet.mode}
              values={formValues}
              errors={formErrors}
              isSubmitting={vm.sheet.isSubmitting}
              onCancel={() => vm.sheet.onOpenChange(false)}
              onSubmit={vm.sheet.submit}
              onChange={(key, value) => vm.sheet.form.setValue(key, value)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={vm.deletion.isOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus reseller?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data transaksi yang terkait
              akan tetap tersimpan namun relasi ke reseller akan dilepas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => vm.deletion.confirm()}
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
