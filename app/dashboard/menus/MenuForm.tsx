'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  MENU_SIZES,
  MENU_TEMPERATURES,
  type MenuListItem,
  type MenuSize,
  type MenuTemperature,
  type MenuVariantsConfig,
} from '@/features/menus/types';
import type { MenuVariantsInput } from '@/features/menus/schemas';

type MenuFormMode = 'create' | 'edit';

type PriceMatrix = Record<MenuSize, Record<MenuTemperature, string>>;

type VariantState = {
  allowedSizes: Record<MenuSize, boolean>;
  allowedTemperatures: Record<MenuTemperature, boolean>;
  defaultSize: MenuSize | null;
  defaultTemperature: MenuTemperature | null;
  retailPrices: PriceMatrix;
  resellerPrices: PriceMatrix;
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
  variants: VariantState;
};

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
      variants: MenuVariantsInput;
    };

type MenuFormProps = {
  mode: MenuFormMode;
  initialValues: MenuFormValues;
  categories: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
  onSubmit: (payload: MenuFormSubmitPayload) => Promise<void> | void;
  onCancel: () => void;
};

const SIZE_LABEL: Record<MenuSize, string> = {
  s: 'Small (S)',
  m: 'Medium (M)',
  l: 'Large (L)',
};

const TEMP_LABEL: Record<MenuTemperature, string> = {
  hot: 'Hot',
  ice: 'Ice',
};

export function createEmptyPriceMatrix(): PriceMatrix {
  const matrix: PriceMatrix = {
    s: { hot: '', ice: '' },
    m: { hot: '', ice: '' },
    l: { hot: '', ice: '' },
  };
  return matrix;
}

function clampDefaults(
  variants: VariantState,
): VariantState {
  const allowedSizes = getAllowedSizes(variants);
  const allowedTemps = getAllowedTemperatures(variants);

  const defaultSize =
    variants.defaultSize && allowedSizes.includes(variants.defaultSize)
      ? variants.defaultSize
      : allowedSizes[0] ?? null;
  const defaultTemperature =
    variants.defaultTemperature &&
    allowedTemps.includes(variants.defaultTemperature)
      ? variants.defaultTemperature
      : allowedTemps[0] ?? null;

  return {
    ...variants,
    defaultSize,
    defaultTemperature,
  };
}

function getAllowedSizes(variants: VariantState): MenuSize[] {
  return MENU_SIZES.filter((size) => variants.allowedSizes[size]);
}

function getAllowedTemperatures(variants: VariantState): MenuTemperature[] {
  return MENU_TEMPERATURES.filter(
    (temperature) => variants.allowedTemperatures[temperature],
  );
}

function normalizeNumber(value: string): number | null {
  if (!value.trim()) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return Math.max(0, Math.round(numeric));
}

const NO_CATEGORY_VALUE = "__none";

export function MenuForm({
  mode,
  initialValues,
  categories,
  isSubmitting,
  onSubmit,
  onCancel,
}: MenuFormProps) {
  const [values, setValues] = React.useState<MenuFormValues>(initialValues);

  React.useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const allowedSizes = getAllowedSizes(values.variants);
  const allowedTemps = getAllowedTemperatures(values.variants);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (values.type === 'simple') {
        const price = normalizeNumber(values.price);
        if (price == null) {
          toast.error('Harga retail wajib diisi');
          return;
        }
        const resellerPrice = normalizeNumber(values.resellerPrice);

        await onSubmit({
          type: 'simple',
          name: values.name.trim(),
          sku: values.sku.trim() || null,
          categoryId: values.categoryId,
          thumbnailUrl: values.thumbnailUrl.trim() || null,
          isActive: values.isActive,
          price,
          resellerPrice: resellerPrice ?? null,
        });
        return;
      }

      const variantSizes = getAllowedSizes(values.variants);
      const variantTemps = getAllowedTemperatures(values.variants);

      if (variantSizes.length === 0) {
        toast.error('Pilih minimal satu size untuk menu variant');
        return;
      }
      if (variantTemps.length === 0) {
        toast.error('Pilih minimal satu temperature untuk menu variant');
        return;
      }

      const defaultSize =
        values.variants.defaultSize ?? variantSizes[0] ?? null;
      const defaultTemperature =
        values.variants.defaultTemperature ?? variantTemps[0] ?? null;

      const retail: MenuVariantsInput['prices']['retail'] = {};
      const reseller: MenuVariantsInput['prices']['reseller'] = {};

      for (const size of variantSizes) {
        retail[size] = {};
        reseller[size] = {};
        for (const temperature of variantTemps) {
          const retailValue = normalizeNumber(
            values.variants.retailPrices[size][temperature],
          );
          const resellerValue = normalizeNumber(
            values.variants.resellerPrices[size][temperature],
          );
          retail[size][temperature] =
            retailValue != null ? retailValue : null;
          reseller[size][temperature] =
            resellerValue != null ? resellerValue : null;
        }
      }

      if (
        defaultSize &&
        defaultTemperature &&
        (retail[defaultSize]?.[defaultTemperature] == null ||
          retail[defaultSize]?.[defaultTemperature] === null)
      ) {
        toast.error(
          'Harga retail untuk kombinasi default wajib diisi',
        );
        return;
      }

      await onSubmit({
        type: 'variant',
        name: values.name.trim(),
        sku: values.sku.trim() || null,
        categoryId: values.categoryId,
        thumbnailUrl: values.thumbnailUrl.trim() || null,
        isActive: values.isActive,
        variants: {
          allowedSizes: variantSizes,
          allowedTemperatures: variantTemps,
          defaultSize,
          defaultTemperature,
          prices: {
            retail,
            reseller,
          },
        },
      });
    },
    [onSubmit, values],
  );

  function handleTypeChange(next: 'simple' | 'variant') {
    setValues((prev) => ({
      ...prev,
      type: next,
    }));
  }

  function handleToggleSize(size: MenuSize) {
    setValues((prev) => {
      const nextVariants: VariantState = {
        ...prev.variants,
        allowedSizes: {
          ...prev.variants.allowedSizes,
          [size]: !prev.variants.allowedSizes[size],
        },
      };
      if (!nextVariants.allowedSizes[size]) {
        nextVariants.retailPrices[size] = { hot: '', ice: '' };
        nextVariants.resellerPrices[size] = { hot: '', ice: '' };
      }
      return {
        ...prev,
        variants: clampDefaults(nextVariants),
      };
    });
  }

  function handleToggleTemperature(temperature: MenuTemperature) {
    setValues((prev) => {
      const nextVariants: VariantState = {
        ...prev.variants,
        allowedTemperatures: {
          ...prev.variants.allowedTemperatures,
          [temperature]: !prev.variants.allowedTemperatures[temperature],
        },
      };
      if (!nextVariants.allowedTemperatures[temperature]) {
        for (const size of MENU_SIZES) {
          nextVariants.retailPrices[size][temperature] = '';
          nextVariants.resellerPrices[size][temperature] = '';
        }
      }
      return {
        ...prev,
        variants: clampDefaults(nextVariants),
      };
    });
  }

  function handleVariantPriceChange(
    channel: 'retail' | 'reseller',
    size: MenuSize,
    temperature: MenuTemperature,
    value: string,
  ) {
    setValues((prev) => {
      const nextVariants: VariantState = {
        ...prev.variants,
        retailPrices: { ...prev.variants.retailPrices },
        resellerPrices: { ...prev.variants.resellerPrices },
      };

      const matrix =
        channel === 'retail'
          ? nextVariants.retailPrices
          : nextVariants.resellerPrices;

      matrix[size] = {
        ...matrix[size],
        [temperature]: value,
      };

      return {
        ...prev,
        variants: nextVariants,
      };
    });
  }

  function handleDefaultChange(field: 'size' | 'temperature', value: string) {
    setValues((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        defaultSize:
          field === 'size'
            ? (value as MenuSize)
            : prev.variants.defaultSize,
        defaultTemperature:
          field === 'temperature'
            ? (value as MenuTemperature)
            : prev.variants.defaultTemperature,
      },
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="menu-name">Nama Menu</Label>
        <Input
          id="menu-name"
          value={values.name}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, name: event.target.value }))
          }
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="menu-sku">SKU</Label>
          <Input
            id="menu-sku"
            value={values.sku}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, sku: event.target.value }))
            }
            placeholder="Opsional"
          />
        </div>
        <div className="space-y-2">
          <Label>Kategori</Label>
          <Select
            value={values.categoryId ?? NO_CATEGORY_VALUE}
            onValueChange={(value) =>
              setValues((prev) => ({
                ...prev,
                categoryId: value === NO_CATEGORY_VALUE ? null : value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY_VALUE}>Tanpa kategori</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="menu-thumbnail">Thumbnail URL</Label>
        <Input
          id="menu-thumbnail"
          value={values.thumbnailUrl}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              thumbnailUrl: event.target.value,
            }))
          }
          placeholder="https://"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Status menu</p>
          <p className="text-xs text-muted-foreground">
            Nonaktifkan jika belum siap ditampilkan di POS
          </p>
        </div>
        <Switch
          checked={values.isActive}
          onCheckedChange={(checked) =>
            setValues((prev) => ({ ...prev, isActive: checked }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Tipe Menu</Label>
        <ToggleGroup
          type="single"
          value={values.type}
          onValueChange={(value) => {
            if (value === 'simple' || value === 'variant') {
              handleTypeChange(value);
            }
          }}
          className="w-full"
        >
          <ToggleGroupItem value="simple" className="flex-1">
            Menu Simple
          </ToggleGroupItem>
          <ToggleGroupItem value="variant" className="flex-1">
            Menu Variant
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {values.type === 'simple' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="menu-price">Harga Retail</Label>
            <Input
              id="menu-price"
              type="number"
              min={0}
              value={values.price}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  price: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-reseller-price">Harga Reseller</Label>
            <Input
              id="menu-reseller-price"
              type="number"
              min={0}
              value={values.resellerPrice}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  resellerPrice: event.target.value,
                }))
              }
              placeholder="Opsional"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Variasi Size</p>
                <span className="text-xs text-muted-foreground">
                  Pilih minimal satu
                </span>
              </div>
              <div className="space-y-2">
                {MENU_SIZES.map((size) => (
                  <div key={size} className="flex items-center gap-2">
                    <Checkbox
                      checked={values.variants.allowedSizes[size]}
                      onCheckedChange={() => handleToggleSize(size)}
                      disabled={
                        values.variants.allowedSizes[size] &&
                        getAllowedSizes(values.variants).length === 1
                      }
                    />
                    <span className="text-sm text-foreground">
                      {SIZE_LABEL[size]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Default size
                </Label>
                <Select
                  value={values.variants.defaultSize ?? undefined}
                  onValueChange={(value) => handleDefaultChange('size', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih size default" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {SIZE_LABEL[size]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Variasi Temperature</p>
                <span className="text-xs text-muted-foreground">
                  Pilih minimal satu
                </span>
              </div>
              <div className="space-y-2">
                {MENU_TEMPERATURES.map((temperature) => (
                  <div key={temperature} className="flex items-center gap-2">
                    <Checkbox
                      checked={values.variants.allowedTemperatures[temperature]}
                      onCheckedChange={() => handleToggleTemperature(temperature)}
                      disabled={
                        values.variants.allowedTemperatures[temperature] &&
                        getAllowedTemperatures(values.variants).length === 1
                      }
                    />
                    <span className="text-sm text-foreground">
                      {TEMP_LABEL[temperature]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Default temperature
                </Label>
                <Select
                  value={values.variants.defaultTemperature ?? undefined}
                  onValueChange={(value) =>
                    handleDefaultChange('temperature', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih temperature default" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTemps.map((temperature) => (
                      <SelectItem key={temperature} value={temperature}>
                        {TEMP_LABEL[temperature]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Harga Retail</p>
              <span className="text-xs text-muted-foreground">
                Diisi dalam Rupiah tanpa desimal
              </span>
            </div>
            <VariantPriceGrid
              allowedSizes={allowedSizes}
              allowedTemperatures={allowedTemps}
              prices={values.variants.retailPrices}
              onChange={(size, temperature, value) =>
                handleVariantPriceChange('retail', size, temperature, value)
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Harga Reseller</p>
              <span className="text-xs text-muted-foreground">
                Opsional, untuk channel reseller
              </span>
            </div>
            <VariantPriceGrid
              allowedSizes={allowedSizes}
              allowedTemperatures={allowedTemps}
              prices={values.variants.resellerPrices}
              onChange={(size, temperature, value) =>
                handleVariantPriceChange('reseller', size, temperature, value)
              }
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan…' : mode === 'create' ? 'Simpan Menu' : 'Perbarui Menu'}
        </Button>
      </div>
    </form>
  );
}

type VariantPriceGridProps = {
  allowedSizes: MenuSize[];
  allowedTemperatures: MenuTemperature[];
  prices: PriceMatrix;
  onChange: (size: MenuSize, temperature: MenuTemperature, value: string) => void;
};

function VariantPriceGrid({
  allowedSizes,
  allowedTemperatures,
  prices,
  onChange,
}: VariantPriceGridProps) {
  if (allowedSizes.length === 0 || allowedTemperatures.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        Pilih kombinasi size dan temperature terlebih dahulu.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
              Size \ Temp
            </th>
            {allowedTemperatures.map((temperature) => (
              <th
                key={temperature}
                className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground"
              >
                {TEMP_LABEL[temperature]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {allowedSizes.map((size) => (
            <tr key={size}>
              <td className="px-3 py-2 text-sm font-medium text-foreground">
                {SIZE_LABEL[size]}
              </td>
              {allowedTemperatures.map((temperature) => (
                <td key={`${size}-${temperature}`} className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    value={prices[size][temperature]}
                    onChange={(event) =>
                      onChange(size, temperature, event.target.value)
                    }
                    placeholder="0"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function createVariantStateFromConfig(
  config: MenuVariantsConfig | null,
): VariantState {
  const state: VariantState = {
    allowedSizes: { s: false, m: false, l: false },
    allowedTemperatures: { hot: false, ice: false },
    defaultSize: config?.default_size ?? null,
    defaultTemperature: config?.default_temperature ?? null,
    retailPrices: createEmptyPriceMatrix(),
    resellerPrices: createEmptyPriceMatrix(),
  };

  if (!config) {
    state.allowedSizes.s = true;
    state.allowedTemperatures.hot = true;
    return clampDefaults(state);
  }

  for (const size of config.allowed_sizes) {
    state.allowedSizes[size] = true;
  }

  for (const temperature of config.allowed_temperatures) {
    state.allowedTemperatures[temperature] = true;
  }

  for (const [sizeKey, temps] of Object.entries(config.prices.retail)) {
    const size = sizeKey as MenuSize;
    if (!state.retailPrices[size]) continue;
    for (const [tempKey, value] of Object.entries(temps ?? {})) {
      const temperature = tempKey as MenuTemperature;
      state.retailPrices[size][temperature] =
        value != null ? String(value) : '';
    }
  }

  for (const [sizeKey, temps] of Object.entries(config.prices.reseller)) {
    const size = sizeKey as MenuSize;
    if (!state.resellerPrices[size]) continue;
    for (const [tempKey, value] of Object.entries(temps ?? {})) {
      const temperature = tempKey as MenuTemperature;
      state.resellerPrices[size][temperature] =
        value != null ? String(value) : '';
    }
  }

  return clampDefaults(state);
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
    variants: createVariantStateFromConfig(null),
  };
}

export function mapMenuToFormValues(menu: MenuListItem): MenuFormValues {
  const base = {
    name: menu.name,
    sku: menu.sku ?? '',
    categoryId: menu.category_id,
    thumbnailUrl: menu.thumbnail_url ?? '',
    isActive: menu.is_active,
  };

  if (menu.type === 'simple') {
    return {
      type: 'simple',
      ...base,
      price: menu.price != null ? String(menu.price) : '',
      resellerPrice:
        menu.reseller_price != null ? String(menu.reseller_price) : '',
      variants: createVariantStateFromConfig(null),
    };
  }

  return {
    type: 'variant',
    ...base,
    price: '',
    resellerPrice: '',
    variants: createVariantStateFromConfig(menu.variants),
  };
}
