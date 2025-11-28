'use client';

import * as React from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { RecipeInput } from '@/features/recipes/client';

type FormIngredient = {
  ingredientId: string;
  ingredientName?: string | null;
  quantity: string;
  uom: string;
};

type FormMethodStep = {
  stepNo: string;
  instruction: string;
};

type FormVariantOverride = {
  size: string;
  temperature: string;
  items: FormIngredient[];
};

type RecipeFormValues = {
  menuId: string;
  version: string;
  effectiveFrom: string;
  items: FormIngredient[];
  methodSteps: FormMethodStep[];
  variantOverrides: FormVariantOverride[];
};

type RecipeFormProps = {
  mode: 'create' | 'edit';
  menus: Array<{ id: string; name: string }>;
  ingredients: Array<{ id: string; name: string; baseUom: string }>;
  initialValues?: {
    menuId: string;
    version: number;
    effectiveFrom?: string | null;
    items: Array<{
      ingredientId: string;
      ingredientName?: string | null;
      quantity: number;
      uom: string;
    }>;
    methodSteps: Array<{ stepNo: number; instruction: string }>;
    variantOverrides: Array<{
      size: string;
      temperature: string;
      items: Array<{
        ingredientId: string;
        ingredientName?: string | null;
        quantity: number;
        uom: string;
      }>;
    }>;
  } | null;
  loading?: boolean;
  onSubmit: (input: RecipeInput) => Promise<void> | void;
  onCancel: () => void;
};

const ingredientSchema = z.object({
  ingredientId: z.string().uuid({ message: 'Pilih ingredient' }),
  quantity: z.coerce.number().positive('Quantity harus > 0'),
  uom: z.string().trim().min(1, 'UOM wajib diisi'),
});

const methodStepSchema = z.object({
  stepNo: z.coerce.number().int().min(1, 'Step minimal 1'),
  instruction: z.string().trim().min(1, 'Instruksi wajib diisi'),
});

const overrideSchema = z.object({
  size: z.string().trim().min(1, 'Size wajib diisi'),
  temperature: z.string().trim().min(1, 'Temperature wajib diisi'),
  items: z.array(ingredientSchema).min(1, 'Isi ingredient untuk override'),
});

const formSchema = z.object({
  menuId: z.string().uuid({ message: 'Pilih menu' }),
  version: z.coerce.number().int().min(1, 'Versi minimal 1'),
  effectiveFrom: z.string().optional().default(''),
  items: z.array(ingredientSchema).min(1, 'Minimal satu ingredient'),
  methodSteps: z.array(methodStepSchema).optional().default([]),
  variantOverrides: z.array(overrideSchema).optional().default([]),
});

const EMPTY_INGREDIENT: FormIngredient = {
  ingredientId: '',
  quantity: '',
  uom: '',
};

const EMPTY_METHOD_STEP: FormMethodStep = {
  stepNo: '',
  instruction: '',
};

const EMPTY_OVERRIDE: FormVariantOverride = {
  size: '',
  temperature: '',
  items: [{ ...EMPTY_INGREDIENT }],
};

function buildInitialState(
  initialValues: RecipeFormProps['initialValues'],
  defaultMenuId: string,
): RecipeFormValues {
  return {
    menuId: initialValues?.menuId ?? defaultMenuId ?? '',
    version: String(initialValues?.version ?? 1),
    effectiveFrom: initialValues?.effectiveFrom ?? '',
    items:
      initialValues?.items?.map((item) => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName ?? null,
        quantity: String(item.quantity ?? ''),
        uom: item.uom ?? '',
      })) ?? [{ ...EMPTY_INGREDIENT }],
    methodSteps:
      initialValues?.methodSteps?.map((step) => ({
        stepNo: String(step.stepNo ?? ''),
        instruction: step.instruction ?? '',
      })) ?? [],
    variantOverrides:
      initialValues?.variantOverrides?.map((override) => ({
        size: override.size,
        temperature: override.temperature,
        items:
          override.items?.map((item) => ({
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName ?? null,
            quantity: String(item.quantity ?? ''),
            uom: item.uom ?? '',
          })) ?? [{ ...EMPTY_INGREDIENT }],
      })) ?? [],
  };
}

export function RecipeForm({
  mode,
  menus,
  ingredients,
  initialValues,
  loading = false,
  onSubmit,
  onCancel,
}: RecipeFormProps) {
  const defaultMenuId = React.useMemo(
    () => initialValues?.menuId ?? menus[0]?.id ?? '',
    [initialValues?.menuId, menus],
  );

  const [formState, setFormState] = React.useState<RecipeFormValues>(() =>
    buildInitialState(initialValues, defaultMenuId),
  );

  React.useEffect(() => {
    setFormState(buildInitialState(initialValues, defaultMenuId));
  }, [initialValues, defaultMenuId]);

  const form = useForm({
    defaultValues: formState,
    onSubmit: async ({ value }) => {
      const validation = formSchema.safeParse(value);
      if (!validation.success) {
        return;
      }

      const normalized: RecipeInput = {
        menuId: value.menuId,
        version: Number(value.version),
        effectiveFrom: value.effectiveFrom?.trim() || undefined,
        items: value.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: Number(item.quantity),
          uom: item.uom.trim(),
        })),
        methodSteps: value.methodSteps
          ?.filter((step) => step.stepNo || step.instruction)
          .map((step) => ({
            stepNo: Number(step.stepNo),
            instruction: step.instruction.trim(),
          })) ?? [],
        variantOverrides: value.variantOverrides?.map((override) => ({
          size: override.size.trim(),
          temperature: override.temperature.trim(),
          items: override.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: Number(item.quantity),
            uom: item.uom.trim(),
          })),
        })) ?? [],
      };

      await onSubmit(normalized);
      form.reset();
    },
  });

  const isBusy = loading || form.state.isSubmitting;

  const handleAddIngredient = () => {
    form.setFieldValue('items', [...form.state.values.items, { ...EMPTY_INGREDIENT }]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (form.state.values.items.length === 1) return;
    form.setFieldValue(
      'items',
      form.state.values.items.filter((_, idx) => idx !== index),
    );
  };

  const handleAddMethod = () => {
    form.setFieldValue('methodSteps', [
      ...(form.state.values.methodSteps ?? []),
      { ...EMPTY_METHOD_STEP },
    ]);
  };

  const handleRemoveMethod = (index: number) => {
    form.setFieldValue(
      'methodSteps',
      (form.state.values.methodSteps ?? []).filter((_, idx) => idx !== index),
    );
  };

  const handleAddOverride = () => {
    form.setFieldValue('variantOverrides', [
      ...(form.state.values.variantOverrides ?? []),
      { ...EMPTY_OVERRIDE },
    ]);
  };

  const handleRemoveOverride = (index: number) => {
    form.setFieldValue(
      'variantOverrides',
      (form.state.values.variantOverrides ?? []).filter((_, idx) => idx !== index),
    );
  };

  const resolveIngredientUom = (ingredientId: string) => {
    const found = ingredients.find((ing) => ing.id === ingredientId);
    return found?.baseUom ?? '';
  };

  return (
    <form
      className="flex flex-col gap-6 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <form.Field name="menuId">
          {(field) => (
            <div className="space-y-2">
              <Label>Menu</Label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih menu" />
                </SelectTrigger>
                <SelectContent>
                  {menus.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.state.meta.errors[0] ? (
                <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="version">
          {(field) => (
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                type="number"
                min={1}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                required
              />
              {field.state.meta.errors[0] ? (
                <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="effectiveFrom">
          {(field) => (
            <div className="space-y-2">
              <Label>Effective From (opsional)</Label>
              <Input
                type="datetime-local"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Ingredients</h3>
            <p className="text-sm text-muted-foreground">
              Daftar bahan yang dibutuhkan untuk resep ini.
            </p>
          </div>
          <Button type="button" onClick={handleAddIngredient} disabled={isBusy} variant="outline" size="sm">
            <IconPlus className="mr-2 h-4 w-4" />
            Add Ingredient
          </Button>
        </div>

        {form.state.values.items.map((item, index) => (
          <div key={index} className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Item {index + 1}</span>
              {form.state.values.items.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveIngredient(index)}
                  disabled={isBusy}
                >
                  <IconTrash className="mr-2 h-4 w-4 text-destructive" />
                  Remove
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <form.Field name={`items[${index}].ingredientId`}>
                {(field) => (
                  <div className="space-y-2">
                    <Label>Ingredient</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value);
                        const nextUom = resolveIngredientUom(value);
                        if (nextUom) {
                          form.setFieldValue(`items[${index}].uom`, nextUom);
                        }
                        const ing = ingredients.find((ing) => ing.id === value);
                        form.setFieldValue(`items[${index}].ingredientName`, ing?.name ?? '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih ingredient" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors[0] ? (
                      <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name={`items[${index}].quantity`}>
                {(field) => (
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      required
                    />
                    {field.state.meta.errors[0] ? (
                      <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name={`items[${index}].uom`}>
                {(field) => (
                  <div className="space-y-2">
                    <Label>UOM</Label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      required
                    />
                    {field.state.meta.errors[0] ? (
                      <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                    ) : null}
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Method Steps</h3>
            <p className="text-sm text-muted-foreground">
              Urutkan langkah pembuatan.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddMethod} disabled={isBusy}>
            <IconPlus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </div>

        {(form.state.values.methodSteps ?? []).map((step, index) => (
          <div key={index} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Step {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMethod(index)}
                disabled={isBusy}
              >
                <IconTrash className="mr-2 h-4 w-4 text-destructive" />
                Remove
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <form.Field name={`methodSteps[${index}].stepNo`}>
                {(field) => (
                  <div className="space-y-2">
                    <Label>Step No</Label>
                    <Input
                      type="number"
                      min={1}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors[0] ? (
                      <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                    ) : null}
                  </div>
                )}
              </form.Field>
              <form.Field name={`methodSteps[${index}].instruction`}>
                {(field) => (
                  <div className="space-y-2 md:col-span-3">
                    <Label>Instruction</Label>
                    <Textarea
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Langkah detail..."
                    />
                    {field.state.meta.errors[0] ? (
                      <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                    ) : null}
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Variant Overrides (Opsional)</h3>
            <p className="text-sm text-muted-foreground">
              Tetapkan ingredient berbeda per size/temperature.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddOverride} disabled={isBusy}>
            <IconPlus className="mr-2 h-4 w-4" />
            Add Override
          </Button>
        </div>

        {(form.state.values.variantOverrides ?? []).map((override, index) => (
          <div key={index} className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Override {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveOverride(index)}
                disabled={isBusy}
              >
                <IconTrash className="mr-2 h-4 w-4 text-destructive" />
                Remove
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <form.Field name={`variantOverrides[${index}].size`}>
                {(field) => (
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="m / l / s"
                    />
                    {field.state.meta.errors[0] ? (
                      <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                    ) : null}
                  </div>
                )}
              </form.Field>
              <form.Field name={`variantOverrides[${index}].temperature`}>
                {(field) => (
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="hot / ice"
                    />
                    {field.state.meta.errors[0] ? (
                      <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                    ) : null}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Override Ingredients</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const current = form.state.values.variantOverrides ?? [];
                    const currentOverride = current[index] ?? { ...EMPTY_OVERRIDE };
                    const nextOverrides = [...current];
                    nextOverrides[index] = {
                      ...currentOverride,
                      items: [...(currentOverride.items ?? []), { ...EMPTY_INGREDIENT }],
                    };
                    form.setFieldValue('variantOverrides', nextOverrides);
                  }}
                  disabled={isBusy}
                >
                  <IconPlus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {(override.items ?? []).map((item, itemIdx) => (
                <div key={itemIdx} className="grid gap-3 md:grid-cols-3">
                  <form.Field name={`variantOverrides[${index}].items[${itemIdx}].ingredientId`}>
                    {(field) => (
                      <div className="space-y-2">
                        <Label>Ingredient</Label>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) => {
                            field.handleChange(value);
                            const nextUom = resolveIngredientUom(value);
                            if (nextUom) {
                              form.setFieldValue(
                                `variantOverrides[${index}].items[${itemIdx}].uom`,
                                nextUom,
                              );
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih ingredient" />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredients.map((ing) => (
                              <SelectItem key={ing.id} value={ing.id}>
                                {ing.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {field.state.meta.errors[0] ? (
                          <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                        ) : null}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name={`variantOverrides[${index}].items[${itemIdx}].quantity`}>
                    {(field) => (
                      <div className="space-y-2">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors[0] ? (
                          <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                        ) : null}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name={`variantOverrides[${index}].items[${itemIdx}].uom`}>
                    {(field) => (
                      <div className="space-y-2">
                        <Label>UOM</Label>
                        <Input
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors[0] ? (
                          <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                        ) : null}
                      </div>
                    )}
                  </form.Field>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
          Cancel
        </Button>
        <Button type="submit" disabled={isBusy}>
          {isBusy ? 'Saving…' : mode === 'create' ? 'Create Recipe' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
