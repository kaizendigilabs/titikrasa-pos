"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowDown, IconArrowUp, IconScale } from "@tabler/icons-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { type DateRangeType, getDateRange } from "@/lib/utils/date-helpers";
import { useCashFlows } from "@/features/finance/hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface FinanceStatsProps {
  range: DateRangeType;
}

export function FinanceStats({ range }: FinanceStatsProps) {
  const { start, end } = getDateRange(range);
  
  const { data, isLoading } = useCashFlows({
    page: 1,
    pageSize: 1, // We only need summary
    type: "all",
    categoryId: null,
    search: "",
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });

  const summary = data?.summary;

  if (isLoading && !data) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
         <Skeleton className="h-32 rounded-xl" />
         <Skeleton className="h-32 rounded-xl" />
         <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (!summary) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 border-none dark:from-primary/80 dark:to-primary/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary-foreground/80">
            Total Pemasukan
          </CardTitle>
          <div className="rounded-full bg-white/20 p-2 text-white">
            <IconArrowUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(summary.totalIn)}
          </div>
          <p className="text-xs text-primary-foreground/70 mt-1">
            Total pemasukan bersih
          </p>
        </CardContent>
      </Card>
      <Card className="bg-card shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Pengeluaran
          </CardTitle>
          <div className="rounded-full p-2 bg-muted-foreground text-primary-foreground">
            <IconArrowDown className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(summary.totalOut)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total pengeluaran operasional
          </p>
        </CardContent>
      </Card>
      <Card className="bg-linear-to-br from-secondary to-secondary/80 text-secondary-foreground shadow-xl shadow-secondary/25 border-none dark:from-secondary/80 dark:to-secondary/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-secondary-foreground/80">
            Saldo Bersih
          </CardTitle>
          <div className="rounded-full p-2 bg-background">
            <IconScale className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(summary.net)}
          </div>
          <p className="text-xs text-secondary-foreground/70 mt-1">
            Arus kas bersih saat ini
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
