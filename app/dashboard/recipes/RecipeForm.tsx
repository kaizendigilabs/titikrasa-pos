'use client';

import * as React from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';

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

type RecipeFormValues = {
  menuId: string;
  version: string;
  effectiveFrom: string;
  items: FormIngredient[];
  methodSteps: FormMethodStep[];
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
  } | null;
  loading?: boolean;
  onSubmit: (input: RecipeInput) => Promise<void> | void;
  onCancel: () => void;
};

const EMPTY_INGREDIENT: FormIngredient = {
  ingredientId: '',
  quantity: '',
  uom: '',
};

const EMPTY_METHOD_STEP: FormMethodStep = {
  stepNo: '',
  instruction: '',
};

export function RecipeForm({
  mode,
  menus,
  ingredients,
  initialValues,
  loading = false,
  onSubmit,
  onCancel,
}: RecipeFormProps) {
  const defaultMenuId = React.useMemo(() => initialValues?.menuId ?? menus[0]?.id ?? '', [initialValues?.menuId, menus]);

  const [values, setValues] = React.useState<RecipeFormValues>(() => buildInitialState(initialValues, defaultMenuId));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setValues(buildInitialState(initialValues, defaultMenuId));
  }, [initialValues, defaultMenuId]);

  const handleIngredientChange = React.useCallback(
    (index: number, key: keyof FormIngredient, value: string) => {
      setValues((prev) => {
        const nextItems = [...prev.items];
        const ingredient = { ...nextItems[index], [key]: value };

        if (key === 'ingredientId') {
          const lookup = ingredients.find((item) => item.id === value);
          ingredient.ingredientName = lookup?.name ?? null;
          if (lookup && !ingredient.uom) {
            ingredient.uom = lookup.baseUom ?? '';
          }
        }

        nextItems[index] = ingredient;
        return { ...prev, items: nextItems };
      });
    },
    [ingredients],
  );

  const handleMethodStepChange = React.useCallback((index: number, key: keyof FormMethodStep, value: string) => {
    setValues((prev) => {
      const nextSteps = [...prev.methodSteps];
      nextSteps[index] = { ...nextSteps[index], [key]: value };
      return { ...prev, methodSteps: nextSteps };
    });
  }, []);

  const addIngredientRow = React.useCallback(() => {
    setValues((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_INGREDIENT }],
    }));
  }, []);

  const removeIngredientRow = React.useCallback((index: number) => {
    setValues((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const addMethodStep = React.useCallback(() => {
    setValues((prev) => ({
      ...prev,
      methodSteps: [...prev.methodSteps, { ...EMPTY_METHOD_STEP }],
    }));
  }, []);

  const removeMethodStep = React.useCallback((index: number) => {
    setValues((prev) => ({
      ...prev,
      methodSteps: prev.methodSteps.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!values.menuId) {
      setError('Menu is required');
      return;
    }

    const normalizedItems = values.items
      .map((item) => ({
        ingredientId: item.ingredientId,
        quantity: Number(item.quantity),
        uom: item.uom.trim(),
      }))
      .filter((item) => item.ingredientId && !Number.isNaN(item.quantity) && item.quantity > 0 && item.uom.length > 0);

    if (normalizedItems.length === 0) {
      setError('Please add at least one ingredient with valid quantity and unit');
      return;
    }

    const normalizedSteps = values.methodSteps
      .map((step) => ({
        stepNo: Number(step.stepNo) || 0,
        instruction: step.instruction.trim(),
      }))
      .filter((step) => step.stepNo > 0 && step.instruction.length > 0)
      .sort((a, b) => a.stepNo - b.stepNo);

    const result: RecipeInput = {
      menuId: values.menuId,
      version: Number(values.version) || 1,
      effectiveFrom: values.effectiveFrom ? toISODate(values.effectiveFrom) : undefined,
      items: normalizedItems,
      methodSteps: normalizedSteps,
    };

    if (mode === 'create') {
      result.variantOverrides = [];
    }

    await onSubmit(result);
  }, [mode, onSubmit, values]);

  const menuDisabled = mode === 'edit';

  return (
    <form className="flex h-full flex-col gap-6" onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="recipe-menu">Menu</Label>
            <Select
              value={values.menuId}
              onValueChange={(value) =>
                setValues((prev) => ({ ...prev, menuId: value }))
              }
              disabled={menuDisabled || menus.length === 0}
            >
              <SelectTrigger id="recipe-menu">
                <SelectValue placeholder={menus.length === 0 ? 'No menus available' : 'Select menu'} />
              </SelectTrigger>
              <SelectContent>
                {menus.map((menu) => (
                  <SelectItem key={menu.id} value={menu.id}>
                    {menu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipe-version">Version</Label>
            <Input
              id="recipe-version"
              type="number"
              min={1}
              value={values.version}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, version: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="recipe-effective">Effective Date</Label>
            <Input
              id="recipe-effective"
              type="date"
              value={values.effectiveFrom}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, effectiveFrom: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Ingredients</h3>
            <Button type="button" variant="outline" size="sm" onClick={addIngredientRow}>
              <IconPlus className="mr-2 h-4 w-4" />
              Add Ingredient
            </Button>
          </div>
          <div className="space-y-3">
            {values.items.map((item, index) => (
              <div key={`ingredient-${index}`} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_160px_120px_auto] md:items-end">
                <div className="space-y-2">
                  <Label>Ingredient</Label>
                  <Select
                    value={item.ingredientId}
                    onValueChange={(value) => handleIngredientChange(index, 'ingredientId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ingredient) => (
                        <SelectItem key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={item.quantity}
                    onChange={(event) => handleIngredientChange(index, 'quantity', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UOM</Label>
                  <Input
                    value={item.uom}
                    onChange={(event) => handleIngredientChange(index, 'uom', event.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  {values.items.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredientRow(index)}
                      aria-label="Remove ingredient"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Method Steps</h3>
            <Button type="button" variant="outline" size="sm" onClick={addMethodStep}>
              <IconPlus className="mr-2 h-4 w-4" />
              Add Step
            </Button>
          </div>
          <div className="space-y-3">
            {values.methodSteps.map((step, index) => (
              <div key={`step-${index}`} className="grid gap-3 rounded-md border p-3 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-start">
                <div className="space-y-2">
                  <Label>Step</Label>
                  <Input
                    type="number"
                    min="1"
                    value={step.stepNo}
                    onChange={(event) => handleMethodStepChange(index, 'stepNo', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instruction</Label>
                  <textarea
                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={step.instruction}
                    onChange={(event) => handleMethodStepChange(index, 'instruction', event.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMethodStep(index)}
                    aria-label="Remove method step"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || menus.length === 0}>
          {loading ? 'Saving…' : mode === 'create' ? 'Create Recipe' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

function buildInitialState(initial: RecipeFormProps['initialValues'], fallbackMenuId: string): RecipeFormValues {
  if (initial) {
    const mappedItems = initial.items.length > 0
      ? initial.items.map((item) => ({
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName ?? null,
          quantity: String(item.quantity ?? ''),
          uom: item.uom ?? '',
        }))
      : [{ ...EMPTY_INGREDIENT }];

    const mappedSteps = initial.methodSteps.map((step) => ({
      stepNo: String(step.stepNo ?? ''),
      instruction: step.instruction ?? '',
    }));

    return {
      menuId: initial.menuId,
      version: String(initial.version ?? 1),
      effectiveFrom: initial.effectiveFrom ? toDateInput(initial.effectiveFrom) : '',
      items: mappedItems,
      methodSteps: mappedSteps,
    };
  }

  return {
    menuId: fallbackMenuId,
    version: '1',
    effectiveFrom: '',
    items: [{ ...EMPTY_INGREDIENT }],
    methodSteps: [],
  };
}

function toISODate(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00Z`).toISOString();
}

function toDateInput(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
