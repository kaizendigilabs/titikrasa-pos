"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import DateRangeFilter from '@/components/shared/DateRangeFilter';
import { getDateRange, type DateRangeType } from "@/lib/utils/date-helpers";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRangeType>("today");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [metrics] = useState(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [chartData] = useState<Array<{ date: string; revenue: number }>>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    const status = searchParams.get("status");
    const message = searchParams.get("message");
    if (status === "forbidden") {
      toast.error(message ?? "You do not have permission to access this resource");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("status");
      params.delete("message");
      router.replace(`/dashboard${params.toString() ? `?${params.toString()}` : ""}`);
      handledRef.current = true;
    }
  }, [router, searchParams]);

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
