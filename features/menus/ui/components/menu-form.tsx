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
  type MenuSize,
  type MenuTemperature,
} from '@/features/menus/types';
import {
  MenuFormState,
  type MenuFormSubmitPayload,
  type MenuFormVariantState,
  type PriceMatrix,
  buildMenuPayload,
  clampVariantDefaults,
  getAllowedSizes,
  getAllowedTemperatures,
} from '@/features/menus/model/forms/state';

type MenuFormMode = 'create' | 'edit';

type MenuFormProps = {
  mode: MenuFormMode;
  initialValues: MenuFormState;
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

const NO_CATEGORY_VALUE = "__none";

export function MenuForm({
  mode,
  initialValues,
  categories,
  isSubmitting,
  onSubmit,
  onCancel,
}: MenuFormProps) {
  const [values, setValues] = React.useState<MenuFormState>(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  const getError = React.useCallback(
    (path: string) => errors[path] ?? null,
    [errors],
  );

  const clearErrors = React.useCallback((...paths: string[]) => {
    if (paths.length === 0) return;
    setErrors((prev) => {
      let mutated = false;
      const next = { ...prev };
      for (const path of paths) {
        if (path in next) {
          delete next[path];
          mutated = true;
        }
      }
      return mutated ? next : prev;
    });
  }, []);

  const clearError = React.useCallback(
    (path: string) => {
      clearErrors(path, "form");
    },
    [clearErrors],
  );

  const allowedSizes = getAllowedSizes(values.variants);
  const allowedTemps = getAllowedTemperatures(values.variants);
  const formError = getError('form');

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = buildMenuPayload(values);
      if (!result.success) {
        setErrors(result.errors);
        const firstMessage = Object.values(result.errors)[0];
        if (firstMessage) {
          toast.error(firstMessage);
        }
        return;
      }

      setErrors({});
      await onSubmit(result.payload);
    },
    [onSubmit, values],
  );

  function handleTypeChange(next: 'simple' | 'variant') {
    setValues((prev) => ({
      ...prev,
      type: next,
    }));
    if (next === 'simple') {
      clearErrors(
        'type',
        'form',
        'variants.allowedSizes',
        'variants.allowedTemperatures',
        'variants.defaultSize',
        'variants.defaultTemperature',
      );
    } else {
      clearErrors('type', 'form', 'price', 'resellerPrice');
    }
  }

  function handleToggleSize(size: MenuSize) {
    setValues((prev) => {
      const nextVariants: MenuFormVariantState = {
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
        variants: clampVariantDefaults(nextVariants),
      };
    });
    clearErrors('variants.allowedSizes', 'variants.defaultSize', 'form');
  }

  function handleToggleTemperature(temperature: MenuTemperature) {
    setValues((prev) => {
      const nextVariants: MenuFormVariantState = {
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
        variants: clampVariantDefaults(nextVariants),
      };
    });
    clearErrors('variants.allowedTemperatures', 'variants.defaultTemperature', 'form');
  }

  function handleVariantPriceChange(
    channel: 'retail' | 'reseller',
    size: MenuSize,
    temperature: MenuTemperature,
    value: string,
  ) {
    setValues((prev) => {
      const nextVariants: MenuFormVariantState = {
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
    clearError(`variants.prices.${channel}.${size}.${temperature}`);
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
    if (field === 'size') {
      clearErrors('variants.defaultSize', 'form');
    } else {
      clearErrors('variants.defaultTemperature', 'form');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="menu-name">Nama Menu</Label>
        <Input
          id="menu-name"
          value={values.name}
          onChange={(event) => {
            const next = event.target.value;
            setValues((prev) => ({ ...prev, name: next }));
            clearErrors('name', 'form');
          }}
          required
        />
        {(() => {
          const error = getError('name');
          return error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null;
        })()}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="menu-sku">SKU</Label>
          <Input
            id="menu-sku"
            value={values.sku}
            onChange={(event) => {
              const next = event.target.value;
              setValues((prev) => ({ ...prev, sku: next }));
              clearErrors('sku', 'form');
            }}
            placeholder="Opsional"
          />
          {(() => {
            const error = getError('sku');
            return error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null;
          })()}
        </div>
        <div className="space-y-2">
          <Label>Kategori</Label>
          <Select
            value={values.categoryId ?? NO_CATEGORY_VALUE}
            onValueChange={(value) =>
              setValues((prev) => {
                const nextCategory = value === NO_CATEGORY_VALUE ? null : value;
                clearErrors('categoryId', 'form');
                return {
                  ...prev,
                  categoryId: nextCategory,
                };
              })
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
          {(() => {
            const error = getError('categoryId');
            return error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null;
          })()}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="menu-thumbnail">Thumbnail URL</Label>
        <Input
          id="menu-thumbnail"
          value={values.thumbnailUrl}
          onChange={(event) => {
            const next = event.target.value;
            setValues((prev) => ({
              ...prev,
              thumbnailUrl: next,
            }));
            clearErrors('thumbnailUrl', 'form');
          }}
          placeholder="https://"
        />
        {(() => {
          const error = getError('thumbnailUrl');
          return error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null;
        })()}
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
              onChange={(event) => {
                const next = event.target.value;
                setValues((prev) => ({
                  ...prev,
                  price: next,
                }));
                clearErrors('price', 'form');
              }}
              required
            />
            {(() => {
              const error = getError('price');
              return error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null;
            })()}
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-reseller-price">Harga Reseller</Label>
            <Input
              id="menu-reseller-price"
              type="number"
              min={0}
              value={values.resellerPrice}
              onChange={(event) => {
                const next = event.target.value;
                setValues((prev) => ({
                  ...prev,
                  resellerPrice: next,
                }));
                clearErrors('resellerPrice', 'form');
              }}
              placeholder="Opsional"
            />
            {(() => {
              const error = getError('resellerPrice');
              return error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null;
            })()}
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
              {(() => {
                const error = getError('variants.allowedSizes');
                return error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : null;
              })()}
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
                {(() => {
                  const error = getError('variants.defaultSize');
                  return error ? (
                    <p className="text-xs text-destructive">{error}</p>
                  ) : null;
                })()}
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
              {(() => {
                const error = getError('variants.allowedTemperatures');
                return error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : null;
              })()}
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
                {(() => {
                  const error = getError('variants.defaultTemperature');
                  return error ? (
                    <p className="text-xs text-destructive">{error}</p>
                  ) : null;
                })()}
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
            channel="retail"
            getError={getError}
            clearError={clearError}
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
            channel="reseller"
            getError={getError}
            clearError={clearError}
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
  channel: 'retail' | 'reseller';
  getError: (path: string) => string | null;
  clearError: (path: string) => void;
};

function VariantPriceGrid({
  allowedSizes,
  allowedTemperatures,
  prices,
  onChange,
  channel,
  getError,
  clearError,
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
                  <div className="space-y-1">
                    <Input
                      type="number"
                      min={0}
                      value={prices[size][temperature]}
                      onChange={(event) => {
                        onChange(size, temperature, event.target.value);
                        clearError(
                          `variants.prices.${channel}.${size}.${temperature}`,
                        );
                      }}
                      placeholder="0"
                    />
                    {(() => {
                      const error = getError(
                        `variants.prices.${channel}.${size}.${temperature}`,
                      );
                      return error ? (
                        <p className="text-xs text-destructive">{error}</p>
                      ) : null;
                    })()}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
