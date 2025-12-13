"use client";

import * as React from "react";
import DateRangeFilter from "@/components/shared/DateRangeFilter";
import { FinanceStats } from "./_components/finance-stats";
import { FinanceTable } from "./_components/finance-table";
import { DateRangeType } from "@/lib/utils/date-helpers";

export default function FinancePageClient() {
  const [range, setRange] = React.useState<DateRangeType>("today");

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6 py-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Monitor arus kas masuk dan keluar secara real-time.
          </p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <FinanceStats range={range} />
      
      <FinanceTable key={range} range={range} />
    </div>
  );
}
