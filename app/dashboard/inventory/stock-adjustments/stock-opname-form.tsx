'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  useCreateStockAdjustmentMutation,
} from '@/features/inventory/stock-adjustments/hooks';
import type { CreateStockAdjustmentPayload } from '@/features/inventory/stock-adjustments/types';
import { formatNumber } from '@/lib/utils/formatters';

type IngredientSnapshot = {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  baseUom: string;
};

type StockOpnameFormProps = {
  ingredients: IngredientSnapshot[];
  canApprove: boolean;
};

type RowState = {
  actual: string;
};

export function StockOpnameForm({ ingredients, canApprove }: StockOpnameFormProps) {
  const [rows, setRows] = React.useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {};
    ingredients.forEach((ingredient) => {
      initial[ingredient.id] = { actual: String(ingredient.currentStock ?? 0) };
    });
    return initial;
  });

  React.useEffect(() => {
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      ingredients.forEach((ingredient) => {
        next[ingredient.id] = prev[ingredient.id] ?? {
          actual: String(ingredient.currentStock ?? 0),
        };
      });
      return next;
    });
  }, [ingredients]);

  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const mutation = useCreateStockAdjustmentMutation();

  const parsedRows = React.useMemo(() => {
    return ingredients.map((ingredient) => {
      const actualValue = rows[ingredient.id]?.actual ?? '';
      const parsed = Number.parseInt(actualValue, 10);
      const actual = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      const delta = actual - (ingredient.currentStock ?? 0);
      const isOutOfSync = delta !== 0;
      return {
        ingredient,
        actual,
        delta,
        status: isOutOfSync ? 'out-of-sync' : 'synced',
      };
    });
  }, [ingredients, rows]);

  const outstandingCount = React.useMemo(
    () => parsedRows.filter((row) => row.status === 'out-of-sync').length,
    [parsedRows],
  );

  const buildPayload = React.useCallback(
    (commit: boolean): CreateStockAdjustmentPayload => ({
      notes: notes.trim(),
      commit,
      items: parsedRows.map(({ ingredient, actual }) => ({
        ingredientId: ingredient.id,
        countedQty: actual,
      })),
    }),
    [notes, parsedRows],
  );

  const handleSubmit = React.useCallback(
    async (commit: boolean) => {
      if (!notes.trim()) {
        setError('Notes are required for stock opname');
        return;
      }
      setError(null);
      try {
        const payload = buildPayload(commit);
        await mutation.mutateAsync(payload);
        toast.success(
          commit
            ? 'Stock synced successfully'
            : 'Draft saved—awaiting approval',
        );
        setNotes('');
        const nextRows: Record<string, RowState> = {};
        parsedRows.forEach(({ ingredient, actual }) => {
          nextRows[ingredient.id] = { actual: String(actual) };
        });
        setRows(nextRows);
      } catch (submitError) {
        const message =
          submitError instanceof Error
            ? submitError.message
            : 'Failed to submit stock opname';
        toast.error(message);
      }
    },
    [buildPayload, mutation, notes, parsedRows],
  );

  const isSaving = mutation.isPending;

  if (ingredients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Stock Opname
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active ingredients found. Add ingredients before performing stock opname.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Physical Count
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {outstandingCount} item(s) differ from system stock. Update the counted quantity below and add a note before submitting.
          </p>
          <div className="space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const reset: Record<string, RowState> = {};
                ingredients.forEach((ingredient) => {
                  reset[ingredient.id] = {
                    actual: String(ingredient.currentStock ?? 0),
                  };
                });
                setRows(reset);
              }}
              disabled={isSaving}
            >
              Reset counts
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border/60">
          <Table>
            <TableHeader className="bg-muted/70">
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead className="w-28 text-right">System</TableHead>
                <TableHead className="w-32 text-right">Counted</TableHead>
                <TableHead className="w-24 text-right">Delta</TableHead>
                <TableHead className="w-32 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedRows.map(({ ingredient, delta, status }) => (
                <TableRow key={ingredient.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {ingredient.name}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">
                        Min {formatNumber(ingredient.minStock, 0)} {ingredient.baseUom}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(ingredient.currentStock ?? 0, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      value={rows[ingredient.id]?.actual ?? ''}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^0-9]/g, '');
                        setRows((prev) => ({
                          ...prev,
                          [ingredient.id]: { actual: value },
                        }));
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="h-9 text-right"
                    />
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      delta === 0
                        ? 'text-muted-foreground'
                        : delta > 0
                          ? 'text-emerald-600'
                          : 'text-destructive'
                    }`}
                  >
                    {delta === 0 ? '—' : delta > 0 ? `+${delta}` : delta}
                  </TableCell>
                  <TableCell className="text-right">
                    {status === 'synced' ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Synced
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Out of sync</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="stock-notes">Notes</Label>
          <textarea
            id="stock-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-[96px] w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            placeholder="Explain discrepancies or provide audit notes"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handleSubmit(false)}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isSaving || !canApprove}
            >
              {isSaving ? 'Syncing…' : canApprove ? 'Sync Now' : 'Awaiting Approval'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
