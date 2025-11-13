"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/formatters";
import type { UseStockOpnameControllerResult } from "./use-stock-opname";

type StockOpnameSummaryProps = {
  controller: UseStockOpnameControllerResult;
};

export function StockOpnameSummary({ controller }: StockOpnameSummaryProps) {
  const totalItems = controller.rows.length;
  const outOfSync = controller.outstandingCount;
  const synced = totalItems - outOfSync;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryCard label="Total ingredients" value={formatNumber(totalItems, 0)} />
      <SummaryCard
        label="Out of sync"
        value={formatNumber(outOfSync, 0)}
        emphasis="warning"
      />
      <SummaryCard label="Synced" value={formatNumber(synced, 0)} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "warning";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`text-2xl font-semibold ${
            emphasis === "warning" ? "text-amber-600" : "text-foreground"
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
