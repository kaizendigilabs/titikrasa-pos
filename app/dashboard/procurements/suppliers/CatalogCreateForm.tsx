'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createCatalogItemSchema,
  type CreateCatalogItemPayload,
} from '@/features/procurements/suppliers/schemas';
import { useCreateCatalogItemMutation } from '@/features/procurements/suppliers/hooks';

const DEFAULT_STATE = {
  name: '',
  baseUom: 'gr',
  purchasePrice: '0',
};

const BASE_UOMS = ['gr', 'ml', 'pcs'] as const;

type CatalogCreateFormProps = {
  supplierId: string;
};

export function CatalogCreateForm({ supplierId }: CatalogCreateFormProps) {
  const router = useRouter();
  const [formState, setFormState] = React.useState(DEFAULT_STATE);
  const createMutation = useCreateCatalogItemMutation(supplierId);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = createCatalogItemSchema.parse({
        supplierId,
        name: formState.name.trim(),
        baseUom: formState.baseUom,
        purchasePrice: Number(formState.purchasePrice || '0'),
        isActive: true,
      }) satisfies CreateCatalogItemPayload;
      await createMutation.mutateAsync(payload);
      toast.success('Catalog item added');
      setFormState(DEFAULT_STATE);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create catalog item';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="catalog-name">Item name</Label>
        <Input
          id="catalog-name"
          value={formState.name}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, name: event.target.value }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="catalog-base-uom">Base UOM</Label>
        <select
          id="catalog-base-uom"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={formState.baseUom}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, baseUom: event.target.value }))
          }
        >
          {BASE_UOMS.map((uom) => (
            <option key={uom} value={uom}>
              {uom.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="catalog-price">Purchase price (IDR)</Label>
        <div className="flex gap-2">
          <Input
            id="catalog-price"
            type="number"
            min={0}
            value={formState.purchasePrice}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                purchasePrice: event.target.value,
              }))
            }
            required
          />
          <Button
            type="submit"
            className="shrink-0"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>
    </form>
  );
}
