'use client';

import * as React from 'react';
import { IconInfoCircle } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import type {
  ResellerFormErrors,
  ResellerFormState,
} from '@/features/resellers/model/forms/state';

export type ResellerFormProps = {
  mode: 'create' | 'edit';
  values: ResellerFormState;
  errors: ResellerFormErrors;
  isSubmitting: boolean;
  onChange: <TKey extends keyof ResellerFormState>(
    key: TKey,
    value: ResellerFormState[TKey],
  ) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
};

export function ResellerForm({
  mode,
  values,
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: ResellerFormProps) {
  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await onSubmit();
    },
    [onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <IconInfoCircle className="h-4 w-4" />
          <span>{errors.form}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="reseller-name">Nama Reseller</Label>
        <Input
          id="reseller-name"
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
          placeholder="Contoh: Kopi Nusantara"
          required
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reseller-email">Email</Label>
          <Input
            id="reseller-email"
            type="email"
            inputMode="email"
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
            placeholder="hello@reseller.id"
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reseller-phone">Nomor Telepon</Label>
          <Input
            id="reseller-phone"
            value={values.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            placeholder="0812-3456-7890"
          />
          {errors.phone ? (
            <p className="text-xs text-destructive">{errors.phone}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reseller-address">Alamat</Label>
        <Input
          id="reseller-address"
          value={values.address}
          onChange={(event) => onChange('address', event.target.value)}
          placeholder="Jl. Sudirman No. 12, Jakarta"
        />
        {errors.address ? (
          <p className="text-xs text-destructive">{errors.address}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reseller-note">Catatan</Label>
        <Input
          id="reseller-note"
          value={values.note}
          onChange={(event) => onChange('note', event.target.value)}
          placeholder="Syarat pembayaran khusus"
        />
        {errors.note ? (
          <p className="text-xs text-destructive">{errors.note}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reseller-payment-term">Tempo Pembayaran (hari)</Label>
          <Input
            id="reseller-payment-term"
            inputMode="numeric"
            value={values.paymentTermDays}
            onChange={(event) => onChange('paymentTermDays', event.target.value)}
            placeholder="30"
          />
          {errors.paymentTermDays ? (
            <p className="text-xs text-destructive">{errors.paymentTermDays}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reseller-discount">Diskon (%)</Label>
          <Input
            id="reseller-discount"
            inputMode="decimal"
            value={values.discountPercent}
            onChange={(event) => onChange('discountPercent', event.target.value)}
            placeholder="10"
          />
          {errors.discountPercent ? (
            <p className="text-xs text-destructive">{errors.discountPercent}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Status reseller</p>
          <p className="text-xs text-muted-foreground">
            Nonaktifkan jika reseller belum siap melakukan transaksi.
          </p>
        </div>
        <Switch
          checked={values.isActive}
          onCheckedChange={(next) => onChange('isActive', next)}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === 'create'
              ? 'Menyimpan…'
              : 'Memperbarui…'
            : mode === 'create'
              ? 'Tambah Reseller'
              : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
}
