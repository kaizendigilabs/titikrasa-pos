'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCreateSupplierLinkMutation } from '@/features/procurements/suppliers/hooks';
import { createSupplierLinkSchema } from '@/features/procurements/suppliers/schemas';

type StoreIngredientOption = {
  id: string;
  name: string;
  baseUom: string;
};

type CatalogLinkFormProps = {
  supplierId: string;
  catalogItemId: string;
  ingredients: StoreIngredientOption[];
  existingIngredientIds: Set<string>;
};

export function CatalogLinkForm({
  supplierId,
  catalogItemId,
  ingredients,
  existingIngredientIds,
}: CatalogLinkFormProps) {
  const router = useRouter();
  const [selectedIngredient, setSelectedIngredient] = React.useState('');
  const [preferred, setPreferred] = React.useState(false);
  const createLinkMutation = useCreateSupplierLinkMutation(supplierId);

  const availableIngredients = React.useMemo(
    () => ingredients.filter((ingredient) => !existingIngredientIds.has(ingredient.id)),
    [ingredients, existingIngredientIds],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = createSupplierLinkSchema.parse({
        supplierId,
        catalogItemId,
        storeIngredientId: selectedIngredient,
        preferred,
      });
      await createLinkMutation.mutateAsync(payload);
      toast.success('Ingredient linked');
      setSelectedIngredient('');
      setPreferred(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link ingredient';
      toast.error(message);
    }
  };

  if (availableIngredients.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        All ingredients are already linked.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 text-sm">
      <div className="flex min-w-[220px] flex-col gap-2">
        <Label htmlFor={`link-ingredient-${catalogItemId}`}>Store ingredient</Label>
        <select
          id={`link-ingredient-${catalogItemId}`}
          className="rounded-md border bg-background px-3 py-2"
          value={selectedIngredient}
          onChange={(event) => setSelectedIngredient(event.target.value)}
          required
        >
          <option value="">Select ingredient</option>
          {availableIngredients.map((ingredient) => (
            <option key={ingredient.id} value={ingredient.id}>
              {ingredient.name} ({ingredient.baseUom})
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={preferred}
          onChange={(event) => setPreferred(event.target.checked)}
        />
        Set as preferred
      </label>
      <Button
        type="submit"
        size="sm"
        disabled={createLinkMutation.isPending || !selectedIngredient}
      >
        {createLinkMutation.isPending ? 'Linking…' : 'Link ingredient'}
      </Button>
    </form>
  );
}
