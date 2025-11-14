'use client';

import * as React from 'react';
import { useForm, type ReactFormExtendedApi } from '@tanstack/react-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { MenuCategory } from '@/features/menu-categories/types';
import { toast } from 'sonner';

export type CategoryFormValues = {
  name: string;
  slug: string;
  iconUrl: string;
  sortOrder: string;
  isActive: boolean;
};

export type CategoryFormSubmitPayload = {
  name: string;
  slug: string;
  iconUrl?: string | null;
  sortOrder?: number | null;
  isActive: boolean;
};

type CategoryFormSheetProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: CategoryFormValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CategoryFormSubmitPayload) => Promise<void>;
  isSubmitting: boolean;
};

export function CategoryFormSheet({
  open,
  mode,
  initialValues,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: CategoryFormSheetProps) {
  const [slugEdited, setSlugEdited] = React.useState(false);
  type CategoryFormApi = ReactFormExtendedApi<
    CategoryFormValues,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >;
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      try {
        const payload = buildSubmitPayload(value);
        await onSubmit(payload);
        form.reset(initialValues);
        setSlugEdited(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Gagal menyimpan kategori';
        toast.error(message);
        throw error;
      }
    },
  }) as CategoryFormApi;

  React.useEffect(() => {
    form.reset(initialValues);
    setSlugEdited(false);
  }, [form, initialValues]);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'Kategori Baru' : 'Edit Kategori'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="category-name">Nama Kategori</Label>
                <Input
                  id="category-name"
                  required
                  value={field.state.value}
                  onChange={(event) => {
                    const value = event.target.value;
                    field.handleChange(value);
                    if (!slugEdited) {
                      form.setFieldValue('slug', slugify(value));
                    }
                  }}
                  onBlur={field.handleBlur}
                  placeholder="Signature Coffee"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="slug">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="category-slug">Slug</Label>
                <Input
                  id="category-slug"
                  required
                  value={field.state.value}
                  onChange={(event) => {
                    setSlugEdited(true);
                    field.handleChange(event.target.value);
                  }}
                  onBlur={field.handleBlur}
                  placeholder="signature-coffee"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="iconUrl">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="category-icon">URL Ikon (opsional)</Label>
                <Input
                  id="category-icon"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="https://..."
                />
              </div>
            )}
          </form.Field>

          <form.Field name="sortOrder">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="category-sort">Urutan (opsional)</Label>
                <Input
                  id="category-sort"
                  type="number"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  Semakin kecil semakin prioritas di daftar.
                </p>
              </div>
            )}
          </form.Field>

          <form.Field name="isActive">
            {(field) => (
              <div className="flex items-center gap-2 rounded-md border px-4 py-3">
                <Checkbox
                  id="category-active"
                  checked={field.state.value}
                  onCheckedChange={(checked) =>
                    field.handleChange(Boolean(checked))
                  }
                />
                <div>
                  <Label htmlFor="category-active">Aktif</Label>
                  <p className="text-xs text-muted-foreground">
                    Jika nonaktif, kategori disembunyikan di POS.
                  </p>
                </div>
              </div>
            )}
          </form.Field>

          <SheetFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || form.state.isSubmitting}
            >
              {isSubmitting || form.state.isSubmitting
                ? 'Menyimpan...'
                : 'Simpan'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function createDefaultCategoryFormValues(): CategoryFormValues {
  return {
    name: '',
    slug: '',
    iconUrl: '',
    sortOrder: '',
    isActive: true,
  };
}

export function mapCategoryToFormValues(
  category: MenuCategory,
): CategoryFormValues {
  return {
    name: category.name,
    slug: category.slug,
    iconUrl: category.icon_url ?? '',
    sortOrder:
      typeof category.sort_order === 'number'
        ? String(category.sort_order)
        : '',
    isActive: category.is_active,
  };
}

function buildSubmitPayload(values: CategoryFormValues): CategoryFormSubmitPayload {
  const name = values.name.trim();
  if (!name) {
    throw new Error('Nama kategori wajib diisi');
  }
  const slug = values.slug.trim();
  if (!slug) {
    throw new Error('Slug kategori wajib diisi');
  }

  const iconUrl = values.iconUrl.trim() || null;
  const sortOrder =
    values.sortOrder.trim() === ''
      ? null
      : Number(values.sortOrder.trim());

  if (sortOrder != null && Number.isNaN(sortOrder)) {
    throw new Error('Urutan kategori harus berupa angka');
  }

  return {
    name,
    slug,
    iconUrl,
    sortOrder,
    isActive: values.isActive,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
