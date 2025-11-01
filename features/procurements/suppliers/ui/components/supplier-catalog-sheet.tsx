'use client';

import * as React from 'react';
import { IconLoader2, IconPencil, IconTrash } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CatalogController } from '../../model/view-model';
import type { CatalogFormState } from '../../model/forms/state';

const BASE_UOM_OPTIONS: Array<{ value: CatalogFormState['baseUom']; label: string }> = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'gr', label: 'Gram (gr)' },
  { value: 'ml', label: 'Mililiter (ml)' },
];

type SupplierCatalogSheetProps = {
  controller: CatalogController;
};

export function SupplierCatalogSheet({ controller }: SupplierCatalogSheetProps) {
  const { supplier, form, isOpen, close, submit, items, isLoading, isMutating, mode } = controller;

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await submit();
    },
    [submit],
  );

  const formatCurrency = React.useMemo(
    () =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }),
    [],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Kelola katalog</DialogTitle>
          <DialogDescription>
            {supplier ? `Atur daftar item pembelian untuk ${supplier.name}.` : 'Pilih supplier.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[380px_1fr]">
          <section className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <header className="space-y-1">
              <h3 className="text-base font-medium text-foreground">
                {mode === 'create' ? 'Tambah item katalog' : 'Edit item katalog'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Lengkapi detail item agar dapat dipakai saat menyusun purchase order.
              </p>
            </header>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="catalog-name">Nama item</Label>
                <Input
                  id="catalog-name"
                  value={form.values.name}
                  onChange={(event) => form.setValue('name', event.target.value)}
                  placeholder="Contoh: Susu Fresh 1L"
                />
                {form.errors.name ? (
                  <p className="text-sm text-destructive">{form.errors.name}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="catalog-base-uom">Satuan dasar</Label>
                <Select
                  value={form.values.baseUom}
                  onValueChange={(value) => form.setValue('baseUom', value as CatalogFormState['baseUom'])}
                >
                  <SelectTrigger id="catalog-base-uom">
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {BASE_UOM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.errors.baseUom ? (
                  <p className="text-sm text-destructive">{form.errors.baseUom}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="catalog-price">Harga beli (IDR)</Label>
                <Input
                  id="catalog-price"
                  inputMode="numeric"
                  value={form.values.purchasePrice}
                  onChange={(event) => form.setValue('purchasePrice', event.target.value)}
                />
                {form.errors.purchasePrice ? (
                  <p className="text-sm text-destructive">{form.errors.purchasePrice}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency.format(Number(form.values.purchasePrice || 0) / 100)}{' '}
                    per {form.values.baseUom}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Aktifkan item</p>
                  <p className="text-xs text-muted-foreground">
                    Item nonaktif tidak akan muncul sebagai pilihan ketika membuat PO.
                  </p>
                </div>
                <Switch
                  checked={form.values.isActive}
                  onCheckedChange={(value) => form.setValue('isActive', value)}
                />
              </div>

              {form.errors.form ? (
                <p className="text-sm text-destructive">{form.errors.form}</p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {mode === 'edit' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={controller.resetForm}
                    disabled={isMutating}
                  >
                    Batal edit
                  </Button>
                ) : null}
                <Button type="submit" disabled={isMutating}>
                  {isMutating ? 'Menyimpan…' : mode === 'create' ? 'Tambah item' : 'Simpan perubahan'}
                </Button>
              </div>
            </form>
          </section>

          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-foreground">Daftar item</h3>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? 'Memuat data katalog…' : `${items.length} item dalam katalog`}
                </p>
              </div>
            </header>

            <div className="max-h-[420px] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Harga beli</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Belum ada item katalog.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id} className={item.is_active ? '' : 'opacity-60'}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Dibuat {new Date(item.created_at).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.base_uom}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatCurrency.format(item.purchase_price / 100)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.is_active ? 'Aktif' : 'Nonaktif'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => controller.editItem(item)}
                              disabled={isMutating}
                            >
                              <IconPencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => controller.toggleItem(item)}
                              disabled={isMutating}
                            >
                              {isMutating ? (
                                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => controller.deleteItem(item)}
                              disabled={isMutating}
                            >
                              <IconTrash className="mr-2 h-4 w-4" />
                              Hapus
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
