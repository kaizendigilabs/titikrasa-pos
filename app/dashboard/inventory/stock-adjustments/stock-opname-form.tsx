"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockOpnameToolbar } from "./_components/toolbar";
import { StockOpnameTable } from "./_components/table";
import { StockOpnameSummary } from "./_components/summary";
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Stock Opname</CardTitle>
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
        <CardTitle className="text-base font-medium">Physical Count</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <StockOpnameToolbar controller={controller} />
        <StockOpnameTable controller={controller} />
        <StockOpnameSummary controller={controller} />
      </CardContent>
    </Card>
  );
}
