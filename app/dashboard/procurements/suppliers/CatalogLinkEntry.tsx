'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  useDeleteSupplierLinkMutation,
  useUpdateSupplierLinkMutation,
} from '@/features/procurements/suppliers/hooks';

type CatalogLinkEntryProps = {
  supplierId: string;
  link: {
    id: string;
    ingredientName: string;
    baseUom: string | null;
    storeIngredientId: string;
    preferred: boolean;
    lastPurchasePrice: number | null;
    lastPurchasedAt: string | null;
  };
};

function formatCurrency(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value / 100);
}

export function CatalogLinkEntry({ supplierId, link }: CatalogLinkEntryProps) {
  const router = useRouter();
  const updateMutation = useUpdateSupplierLinkMutation(supplierId);
  const deleteMutation = useDeleteSupplierLinkMutation(supplierId);

  const handleSetPreferred = async () => {
    try {
      await updateMutation.mutateAsync({
        linkId: link.id,
        payload: { preferred: true },
      });
      toast.success('Preferred link updated');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update preferred link';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove this ingredient link?')) return;
    try {
      await deleteMutation.mutateAsync(link.id);
      toast.success('Link removed');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove link';
      toast.error(message);
    }
  };

  return (
    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-medium text-foreground text-sm">
            {link.ingredientName}
          </span>
          <span>Base UOM: {link.baseUom ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          {link.preferred ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
              Preferred
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSetPreferred}
              disabled={updateMutation.isPending}
            >
              Set preferred
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            Remove
          </Button>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <div>Last price: {formatCurrency(link.lastPurchasePrice)}</div>
        <div>
          Last purchased:{' '}
          {link.lastPurchasedAt
            ? new Date(link.lastPurchasedAt).toLocaleString('id-ID')
            : '—'}
        </div>
      </div>
    </div>
  );
}
