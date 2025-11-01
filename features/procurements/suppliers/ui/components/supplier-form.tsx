'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { FormController } from '../../model/view-model';
import type {
  SupplierFormErrors,
  SupplierFormState,
} from '../../model/forms/state';

const CONTACT_FIELDS: Array<{
  key: keyof SupplierFormState;
  label: string;
  type?: string;
}> = [
  { key: 'contactName', label: 'Nama kontak' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Nomor telepon' },
  { key: 'address', label: 'Alamat' },
  { key: 'note', label: 'Catatan' },
];

type SupplierFormProps = {
  mode: 'create' | 'edit';
  form: FormController<SupplierFormState, SupplierFormErrors>;
  isSubmitting: boolean;
  onSubmit: () => Promise<void> | void;
  onCancel: () => void;
};

export function SupplierForm({ mode, form, isSubmitting, onSubmit, onCancel }: SupplierFormProps) {
  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await onSubmit();
    },
    [onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="supplier-name">Nama supplier</Label>
        <Input
          id="supplier-name"
          value={form.values.name}
          onChange={(event) => form.setValue('name', event.target.value)}
          placeholder="Contoh: CV Maju Jaya"
        />
        {form.errors.name ? (
          <p className="text-sm text-destructive">{form.errors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CONTACT_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`supplier-${field.key}`}>{field.label}</Label>
            <Input
              id={`supplier-${field.key}`}
              type={field.type ?? 'text'}
              value={form.values[field.key] as string}
              onChange={(event) => form.setValue(field.key, event.target.value)}
              placeholder={field.label}
            />
            {form.errors[field.key] ? (
              <p className="text-sm text-destructive">{form.errors[field.key]}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-foreground">Supplier aktif</p>
          <p className="text-xs text-muted-foreground">
            Nonaktifkan supplier untuk menyembunyikannya dari pemilihan purchase order.
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan…' : mode === 'create' ? 'Simpan supplier' : 'Simpan perubahan'}
        </Button>
      </div>
    </form>
  );
}
