'use client';

import * as React from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import type { ReactFormExtendedApi } from '@tanstack/react-form';
import { toast } from 'sonner';
import { IconPlus, IconX } from '@tabler/icons-react';

import {
  MENU_SIZES,
  MENU_TEMPERATURES,
  type MenuListItem,
  type MenuSize,
  type MenuTemperature,
} from '@/features/menus/types';
import {
  MENU_SIZE_LABELS,
  MENU_TEMPERATURE_LABELS,
} from '@/features/menus/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils/cn';

export type MenuFormSubmitPayload =
  | {
      type: 'simple';
      name: string;
      sku?: string | null;
      categoryId?: string | null;
      thumbnailUrl?: string | null;
      isActive: boolean;
      price: number;
      resellerPrice?: number | null;
    }
  | {
      type: 'variant';
      name: string;
      sku?: string | null;
      categoryId?: string | null;
      thumbnailUrl?: string | null;
      isActive: boolean;
      variants: {
        allowedSizes: MenuSize[];
        allowedTemperatures: MenuTemperature[];
        defaultSize: MenuSize;
        defaultTemperature: MenuTemperature;
        prices: {
          retail: VariantPricesRecord;
          reseller: VariantPricesRecord;
        };
      };
    };

type VariantPricesRecord = Partial<
  Record<MenuSize, Partial<Record<MenuTemperature, number | null>>>
>;

type PriceMatrix = Record<MenuSize, Record<MenuTemperature, string>>;

const EMPTY_PRICE_MATRIX: PriceMatrix = {
  s: { hot: '', ice: '' },
  m: { hot: '', ice: '' },
  l: { hot: '', ice: '' },
};

const NO_CATEGORY_VALUE = '__none__';

type VariantFormState = {
  allowedSizes: Record<MenuSize, boolean>;
  allowedTemperatures: Record<MenuTemperature, boolean>;
  defaultSize: MenuSize | null;
  defaultTemperature: MenuTemperature | null;
  retailPrices: PriceMatrix;
  resellerPrices: PriceMatrix;
};

type MenuFormApi = ReactFormExtendedApi<
  MenuFormValues,
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

type FieldController<TValue> = {
  state: { value: TValue };
  handleChange: (value: TValue) => void;
  handleBlur: () => void;
};

export type MenuFormValues = {
  type: 'simple' | 'variant';
  name: string;
  sku: string;
  categoryId: string | null;
  thumbnailUrl: string;
  isActive: boolean;
  price: string;
  resellerPrice: string;
  variants: VariantFormState;
};

type MenuFormSheetProps = {
  open: boolean;
  mode: 'create' | 'edit';
  categories: Array<{ id: string; name: string }>;
  initialValues: MenuFormValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MenuFormSubmitPayload) => Promise<void>;
  isSubmitting: boolean;
};

export function MenuFormSheet({
  open,
  mode,
  categories,
  initialValues,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: MenuFormSheetProps) {
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      try {
        const payload = buildSubmitPayload(value);
        await onSubmit(payload);
        form.reset();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Gagal menyimpan menu';
        toast.error(message);
        throw error;
      }
    },
  });

  React.useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  const formValues = useStore(form.store, (state) => state.values);
  const variantValues = formValues.variants;
  const allowedSizes = MENU_SIZES.filter(
    (size) => variantValues.allowedSizes[size],
  );
  const allowedTemperatures = MENU_TEMPERATURES.filter(
    (temp) => variantValues.allowedTemperatures[temp],
  );

  React.useEffect(() => {
    if (formValues.type !== 'variant') return;
    if (
      variantValues.defaultSize &&
      allowedSizes.includes(variantValues.defaultSize)
    ) {
      return;
    }
    form.setFieldValue(
      'variants.defaultSize',
      allowedSizes[0] ?? null,
    );
  }, [allowedSizes, form, formValues.type, variantValues.defaultSize]);

  React.useEffect(() => {
    if (formValues.type !== 'variant') return;
    if (
      variantValues.defaultTemperature &&
      allowedTemperatures.includes(variantValues.defaultTemperature)
    ) {
      return;
    }
    form.setFieldValue(
      'variants.defaultTemperature',
      allowedTemperatures[0] ?? null,
    );
  }, [
    allowedTemperatures,
    form,
    formValues.type,
    variantValues.defaultTemperature,
  ]);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'Menu Baru' : 'Edit Menu'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          <section className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <form.Field name="name">
                {(field: FieldController<string>) => (
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="menu-name">Nama Menu</Label>
                    <Input
                      id="menu-name"
                      required
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      placeholder="Es Kopi Susu"
                    />
                  </div>
                )}
              </form.Field>
              <form.Field name="sku">
                {(field: FieldController<string>) => (
                  <div className="w-full space-y-2 md:w-48">
                    <Label htmlFor="menu-sku">SKU</Label>
                    <Input
                      id="menu-sku"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      placeholder="OPS-001"
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="categoryId">
                {(field: FieldController<string | null>) => (
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select
                      value={field.state.value ?? NO_CATEGORY_VALUE}
                      onValueChange={(value) =>
                        field.handleChange(
                          value === NO_CATEGORY_VALUE ? null : value,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY_VALUE}>
                          Tanpa kategori
                        </SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
              <form.Field name="thumbnailUrl">
                {(field: FieldController<string>) => (
                  <div className="space-y-2">
                    <Label htmlFor="menu-thumbnail">URL Thumbnail</Label>
                    <Input
                      id="menu-thumbnail"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <Label className="text-sm font-medium">Aktif</Label>
                <p className="text-xs text-muted-foreground">
                  Nonaktifkan jika menu tidak tersedia sementara.
                </p>
              </div>
              <form.Field name="isActive">
                {(field: FieldController<boolean>) => (
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                  />
                )}
              </form.Field>
            </div>
          </section>

          <section className="space-y-4">
            <Label className="text-sm font-medium">Tipe Menu</Label>
            <div className="flex gap-2">
              {(['simple', 'variant'] as const).map((type) => (
                <form.Field key={type} name="type">
                  {(field: FieldController<'simple' | 'variant'>) => (
                    <Button
                      type="button"
                      variant={field.state.value === type ? 'default' : 'outline'}
                      onClick={() => field.handleChange(type)}
                    >
                      {type === 'simple' ? 'Simple' : 'Variant'}
                    </Button>
                  )}
                </form.Field>
              ))}
            </div>

            {formValues.type === 'simple' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="price">
                  {(field: FieldController<string>) => (
                    <div className="space-y-2">
                      <Label htmlFor="menu-price">Harga Retail (IDR)</Label>
                      <Input
                        id="menu-price"
                        inputMode="numeric"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        onBlur={field.handleBlur}
                        required
                        placeholder="25000"
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="resellerPrice">
                  {(field: FieldController<string>) => (
                    <div className="space-y-2">
                      <Label htmlFor="menu-reseller-price">
                        Harga Reseller (opsional)
                      </Label>
                      <Input
                        id="menu-reseller-price"
                        inputMode="numeric"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        onBlur={field.handleBlur}
                        placeholder="22000"
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            ) : (
              <VariantEditor
                form={form}
                allowedSizes={allowedSizes}
                allowedTemperatures={allowedTemperatures}
              />
            )}
          </section>

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

type VariantEditorProps = {
  form: MenuFormApi;
  allowedSizes: MenuSize[];
  allowedTemperatures: MenuTemperature[];
};

function VariantEditor({
  form,
  allowedSizes,
  allowedTemperatures,
}: VariantEditorProps) {
  return (
    <div className="space-y-6 rounded-md border px-4 py-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Size yang tersedia</Label>
          <div className="flex flex-wrap gap-2">
            {MENU_SIZES.map((size) => (
              <form.Field key={size} name={`variants.allowedSizes.${size}`}>
                {(field: FieldController<boolean>) => (
                  <ToggleChip
                    label={MENU_SIZE_LABELS[size]}
                    pressed={field.state.value}
                    onPressedChange={(pressed) =>
                      field.handleChange(Boolean(pressed))
                    }
                  />
                )}
              </form.Field>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Default size</Label>
          <form.Field name="variants.defaultSize">
            {(field: FieldController<MenuSize | null>) => (
              <Select
                value={field.state.value ?? ''}
                onValueChange={(value) =>
                  field.handleChange((value as MenuSize) ?? null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih default size" />
                </SelectTrigger>
                <SelectContent>
                  {allowedSizes.length === 0 ? (
                    <SelectItem disabled value="">
                      Tambah size dahulu
                    </SelectItem>
                  ) : null}
                  {allowedSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {MENU_SIZE_LABELS[size]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </form.Field>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Temperature yang tersedia</Label>
          <div className="flex flex-wrap gap-2">
            {MENU_TEMPERATURES.map((temp) => (
              <form.Field
                key={temp}
                name={`variants.allowedTemperatures.${temp}`}
              >
                {(field: FieldController<boolean>) => (
                  <ToggleChip
                    label={MENU_TEMPERATURE_LABELS[temp]}
                    pressed={field.state.value}
                    onPressedChange={(pressed) =>
                      field.handleChange(Boolean(pressed))
                    }
                  />
                )}
              </form.Field>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Default temperature</Label>
          <form.Field name="variants.defaultTemperature">
            {(field: FieldController<MenuTemperature | null>) => (
              <Select
                value={field.state.value ?? ''}
                onValueChange={(value) =>
                  field.handleChange((value as MenuTemperature) ?? null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih default temperature" />
                </SelectTrigger>
                <SelectContent>
                  {allowedTemperatures.length === 0 ? (
                    <SelectItem disabled value="">
                      Tambah temperature dahulu
                    </SelectItem>
                  ) : null}
                  {allowedTemperatures.map((temp) => (
                    <SelectItem key={temp} value={temp}>
                      {MENU_TEMPERATURE_LABELS[temp]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </form.Field>
        </div>
      </div>

      <div className="space-y-4">
        <PriceMatrixEditor
          label="Harga Retail (IDR)"
          fieldName="variants.retailPrices"
          form={form}
          allowedSizes={allowedSizes}
          allowedTemperatures={allowedTemperatures}
        />
        <PriceMatrixEditor
          label="Harga Reseller (opsional)"
          fieldName="variants.resellerPrices"
          form={form}
          allowedSizes={allowedSizes}
          allowedTemperatures={allowedTemperatures}
        />
      </div>
    </div>
  );
}

type PriceMatrixEditorProps = {
  label: string;
  fieldName: `variants.retailPrices` | `variants.resellerPrices`;
  form: MenuFormApi;
  allowedSizes: MenuSize[];
  allowedTemperatures: MenuTemperature[];
};

function PriceMatrixEditor({
  label,
  fieldName,
  form,
  allowedSizes,
  allowedTemperatures,
}: PriceMatrixEditorProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {allowedSizes.length === 0 || allowedTemperatures.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Pilih minimal satu size dan temperature untuk mengisi harga.
        </p>
      ) : (
        <div className="space-y-3">
          {allowedSizes.map((size) => (
            <div key={size} className="space-y-2 rounded-md border px-3 py-3">
              <p className="text-sm font-medium">{MENU_SIZE_LABELS[size]}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {allowedTemperatures.map((temp) => (
                  <form.Field
                    key={`${size}-${temp}`}
                    name={`${fieldName}.${size}.${temp}`}
                  >
                    {(field: FieldController<string>) => (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {MENU_TEMPERATURE_LABELS[temp]}
                        </Label>
                        <Input
                          inputMode="numeric"
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          onBlur={field.handleBlur}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </form.Field>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ToggleChipProps = {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
};

function ToggleChip({ label, pressed, onPressedChange }: ToggleChipProps) {
  return (
    <Button
      type="button"
      variant={pressed ? 'default' : 'outline'}
      size="sm"
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'gap-2',
        pressed ? 'bg-primary text-primary-foreground' : undefined,
      )}
    >
      {pressed ? <IconX className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export function createDefaultMenuFormValues(): MenuFormValues {
  return {
    type: 'simple',
    name: '',
    sku: '',
    categoryId: null,
    thumbnailUrl: '',
    isActive: true,
    price: '',
    resellerPrice: '',
    variants: {
      allowedSizes: {
        s: true,
        m: false,
        l: false,
      },
      allowedTemperatures: {
        hot: true,
        ice: false,
      },
      defaultSize: 's',
      defaultTemperature: 'hot',
      retailPrices: clonePriceMatrix(EMPTY_PRICE_MATRIX),
      resellerPrices: clonePriceMatrix(EMPTY_PRICE_MATRIX),
    },
  };
}

export function mapMenuToFormValues(menu: MenuListItem): MenuFormValues {
  if (menu.variants) {
    const allowedSizes = Object.fromEntries(
      MENU_SIZES.map((size) => [size, menu.variants!.allowed_sizes.includes(size)]),
    ) as Record<MenuSize, boolean>;
    const allowedTemps = Object.fromEntries(
      MENU_TEMPERATURES.map((temp) => [
        temp,
        menu.variants!.allowed_temperatures.includes(temp),
      ]),
    ) as Record<MenuTemperature, boolean>;

    return {
      type: 'variant',
      name: menu.name,
      sku: menu.sku ?? '',
      categoryId: menu.category_id,
      thumbnailUrl: menu.thumbnail_url ?? '',
      isActive: menu.is_active,
      price: '',
      resellerPrice: '',
      variants: {
        allowedSizes,
        allowedTemperatures: allowedTemps,
        defaultSize: menu.variants.default_size,
        defaultTemperature: menu.variants.default_temperature,
        retailPrices: mapVariantPricesToMatrix(menu.variants.prices.retail),
        resellerPrices: mapVariantPricesToMatrix(menu.variants.prices.reseller),
      },
    };
  }

  return {
    type: 'simple',
    name: menu.name,
    sku: menu.sku ?? '',
    categoryId: menu.category_id,
    thumbnailUrl: menu.thumbnail_url ?? '',
    isActive: menu.is_active,
    price: menu.price != null ? String(menu.price) : '',
    resellerPrice: menu.reseller_price != null ? String(menu.reseller_price) : '',
    variants: createDefaultMenuFormValues().variants,
  };
}

function mapVariantPricesToMatrix(
  prices: VariantPricesRecord,
): PriceMatrix {
  const matrix = clonePriceMatrix(EMPTY_PRICE_MATRIX);
  for (const size of MENU_SIZES) {
    for (const temp of MENU_TEMPERATURES) {
      const value = prices[size]?.[temp];
      matrix[size][temp] =
        value === null || value === undefined ? '' : String(value);
    }
  }
  return matrix;
}

function clonePriceMatrix(source: PriceMatrix): PriceMatrix {
  return {
    s: { ...source.s },
    m: { ...source.m },
    l: { ...source.l },
  };
}

function buildSubmitPayload(values: MenuFormValues): MenuFormSubmitPayload {
  const trimmedName = values.name.trim();
  if (!trimmedName) {
    throw new Error('Nama menu wajib diisi');
  }

  const sku = values.sku.trim() || null;
  const thumbnail = values.thumbnailUrl.trim() || null;
  const category = values.categoryId ?? null;

  if (values.type === 'simple') {
    const price = parseCurrency(values.price);
    if (price == null) {
      throw new Error('Harga retail wajib diisi');
    }
    const resellerPrice = parseCurrency(values.resellerPrice);
    return {
      type: 'simple',
      name: trimmedName,
      sku,
      categoryId: category,
      thumbnailUrl: thumbnail,
      isActive: values.isActive,
      price,
      resellerPrice,
    };
  }

  const allowedSizes = MENU_SIZES.filter(
    (size) => values.variants.allowedSizes[size],
  );
  const allowedTemperatures = MENU_TEMPERATURES.filter(
    (temp) => values.variants.allowedTemperatures[temp],
  );

  if (allowedSizes.length === 0) {
    throw new Error('Pilih minimal satu size untuk menu variant');
  }
  if (allowedTemperatures.length === 0) {
    throw new Error('Pilih minimal satu temperature untuk menu variant');
  }

  const defaultSize =
    values.variants.defaultSize && allowedSizes.includes(values.variants.defaultSize)
      ? values.variants.defaultSize
      : allowedSizes[0];

  const defaultTemperature =
    values.variants.defaultTemperature &&
    allowedTemperatures.includes(values.variants.defaultTemperature)
      ? values.variants.defaultTemperature
      : allowedTemperatures[0];

  const retailPrices = buildVariantPrices(
    values.variants.retailPrices,
    allowedSizes,
    allowedTemperatures,
  );
  const resellerPrices = buildVariantPrices(
    values.variants.resellerPrices,
    allowedSizes,
    allowedTemperatures,
  );

  return {
    type: 'variant',
    name: trimmedName,
    sku,
    categoryId: category,
    thumbnailUrl: thumbnail,
    isActive: values.isActive,
    variants: {
      allowedSizes,
      allowedTemperatures,
      defaultSize,
      defaultTemperature,
      prices: {
        retail: retailPrices,
        reseller: resellerPrices,
      },
    },
  };
}

function buildVariantPrices(
  matrix: PriceMatrix,
  sizes: MenuSize[],
  temperatures: MenuTemperature[],
): VariantPricesRecord {
  const result: VariantPricesRecord = {};
  for (const size of sizes) {
    for (const temp of temperatures) {
      const parsed = parseCurrency(matrix[size][temp]);
      if (!result[size]) {
        result[size] = {};
      }
      result[size]![temp] = parsed;
    }
  }
  return result;
}

function parseCurrency(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return Math.max(0, Math.round(numeric));
}
