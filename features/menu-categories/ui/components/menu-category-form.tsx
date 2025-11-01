'use client';

import * as React from 'react';
import { IconLoader2 } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import type {
  MenuCategoryFormErrors,
  MenuCategoryFormState,
} from '../../model/forms/state';

type MenuCategoryFormProps = {
  mode: 'create' | 'edit';
  values: MenuCategoryFormState;
  errors: MenuCategoryFormErrors;
  isSubmitting: boolean;
  onChange: <TKey extends keyof MenuCategoryFormState>(
    key: TKey,
    value: MenuCategoryFormState[TKey],
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function MenuCategoryForm({
  mode,
  values,
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: MenuCategoryFormProps) {
  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onSubmit();
    },
    [onSubmit],
  );

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="menu-category-name">Nama kategori</Label>
        <Input
          id="menu-category-name"
          autoFocus
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
          placeholder="Contoh: Minuman"
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="menu-category-slug">Slug</Label>
        <Input
          id="menu-category-slug"
          value={values.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          placeholder="minuman"
        />
        {errors.slug ? (
          <p className="text-xs text-destructive">{errors.slug}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="menu-category-sort">Urutan tampilan</Label>
        <Input
          id="menu-category-sort"
          type="number"
          min={0}
          value={values.sortOrder}
          onChange={(event) => onChange('sortOrder', event.target.value)}
          placeholder="0"
        />
        {errors.sortOrder ? (
          <p className="text-xs text-destructive">{errors.sortOrder}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="menu-category-icon">URL ikon</Label>
        <Input
          id="menu-category-icon"
          value={values.iconUrl}
          onChange={(event) => onChange('iconUrl', event.target.value)}
          placeholder="https://…"
        />
        {errors.iconUrl ? (
          <p className="text-xs text-destructive">{errors.iconUrl}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Status kategori</p>
          <p className="text-xs text-muted-foreground">
            Jika nonaktif, kategori tidak akan muncul di POS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="menu-category-active"
            checked={values.isActive}
            onCheckedChange={(checked) => onChange('isActive', checked)}
          />
          <Label htmlFor="menu-category-active" className="text-sm">
            {values.isActive ? 'Aktif' : 'Nonaktif'}
          </Label>
        </div>
      </div>

      {errors.global ? (
        <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errors.global}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {mode === 'create' ? 'Simpan' : 'Perbarui'}
        </Button>
      </div>
    </form>
  );
}
