"use client";

import { Button } from "@/components/ui/button";
import { StockOpnameTable } from "./_components/table";
import { StockOpnameSummary } from "./_components/summary";
import { StockOpnameDialog } from "./_components/stock-opname-dialog";
import {
  useStockOpnameController,
  type StockOpnameIngredientRow,
} from "./_components/use-stock-opname";

type StockOpnameFormProps = {
  ingredients: StockOpnameIngredientRow[];
  canApprove: boolean;
};

export function StockOpnameForm({ ingredients, canApprove }: StockOpnameFormProps) {
  const controller = useStockOpnameController({ ingredients, canApprove });

  if (ingredients.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">
          No active ingredients found. Add ingredients before performing stock opname.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Statistics at the top */}
      <StockOpnameSummary controller={controller} />

      {/* 2. Table */}
      <div className="rounded-md border bg-card">
        <StockOpnameTable controller={controller} />
      </div>

      {/* 3. Actions (Reset & Process) */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          onClick={controller.resetCounts}
          disabled={controller.isSubmitting || controller.outstandingCount === 0}
        >
          Undo
        </Button>
        <StockOpnameDialog controller={controller} />
      </div>

      {controller.statusMessage && (
        <p className="text-right text-sm text-emerald-600">
          {controller.statusMessage}
        </p>
      )}
    </div>
  );
}
