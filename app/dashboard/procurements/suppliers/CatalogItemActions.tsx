'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useDeleteCatalogItemMutation,
  useToggleCatalogItemMutation,
  useUpdateCatalogItemMutation,
} from '@/features/procurements/suppliers/hooks';
import {
  updateCatalogItemSchema,
  type UpdateCatalogItemPayload,
} from '@/features/procurements/suppliers/schemas';

const BASE_UOMS = ['gr', 'ml', 'pcs'] as const;

type CatalogItemActionsProps = {
  supplierId: string;
  item: {
    id: string;
    name: string;
    base_uom: string;
    purchase_price: number;
    is_active: boolean;
  };
};

export function CatalogItemActions({ supplierId, item }: CatalogItemActionsProps) {
  const router = useRouter();
  const [isEditing, setEditing] = React.useState(false);
  const [formState, setFormState] = React.useState({
    name: item.name,
    baseUom: BASE_UOMS.includes(item.base_uom as any) ? item.base_uom : 'gr',
    purchasePrice: String(item.purchase_price),
  });

  const updateMutation = useUpdateCatalogItemMutation(supplierId);
  const toggleMutation = useToggleCatalogItemMutation(supplierId);
  const deleteMutation = useDeleteCatalogItemMutation(supplierId);

  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync({
        catalogItemId: item.id,
        isActive: !item.is_active,
      });
      toast.success(`Item ${!item.is_active ? 'activated' : 'deactivated'}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle item';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${item.name}? This action cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success('Catalog item deleted');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete item';
      toast.error(message);
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = updateCatalogItemSchema.parse({
        name: formState.name.trim(),
        baseUom: formState.baseUom,
        purchasePrice: Number(formState.purchasePrice || '0'),
      }) satisfies UpdateCatalogItemPayload;
      await updateMutation.mutateAsync({ catalogItemId: item.id, payload });
      toast.success('Catalog item updated');
      setEditing(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update item';
      toast.error(message);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={handleToggle} disabled={toggleMutation.isPending}>
          {toggleMutation.isPending ? 'Updating…' : item.is_active ? 'Deactivate' : 'Activate'}
        </Button>
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
          {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </div>

      <Dialog open={isEditing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit catalog item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${item.id}`}>Item name</Label>
              <Input
                id={`edit-name-${item.id}`}
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`edit-base-uom-${item.id}`}>Base UOM</Label>
                <select
                  id={`edit-base-uom-${item.id}`}
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
                <Label htmlFor={`edit-price-${item.id}`}>Purchase price (IDR)</Label>
                <Input
                  id={`edit-price-${item.id}`}
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
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
