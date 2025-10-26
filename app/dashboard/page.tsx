"use client";

import { useState } from "react";
import DateRangeFilter from '@/components/shared/DateRangeFilter';
import { getDateRange, type DateRangeType } from "@/lib/utils/date-helpers";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRangeType>("today");
  const [metrics] = useState(null);
  const [chartData] = useState<Array<{ date: string; revenue: number }>>([]);

  // Get current date range for rendering
  const { start, end } = getDateRange(dateRange);
  const rangeLabel = `${start.toLocaleDateString()} — ${end.toLocaleDateString()}`;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Date Range Filter */}
          <div className="px-4 lg:px-6 space-y-2">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <p className="text-sm text-muted-foreground">Showing data for {rangeLabel}</p>
          </div>

          {/* Metrics Cards */}

          <div className="px-4 lg:px-6">
            {/* Sales Chart */}
          </div>

          <div className="px-4 lg:px-6">
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              {/* Transaction History Table */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
