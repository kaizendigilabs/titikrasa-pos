import { MetricCard } from '@/components/shared/MetricCard';
import { MetricCardActive } from './MetricCardActive';
import { formatCurrency } from '@/lib/utils/formatters';

interface MetricCardsProps {
  data: {
    revenue: number;
    expenses: number;
    aov: number;
    netProfit: number;
  };
}

export function MetricCards({ data }: MetricCardsProps) {
  const trendPlaceholder = "⚠️ belum tersedia";
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <MetricCardActive
        title="Total Revenue"
        value={formatCurrency(data.revenue)}
        placeholderTrendLabel={trendPlaceholder}
        description="Termasuk pending payment"
        className="bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow border-none dark:from-primary/80 dark:to-primary/60 **:data-[slot=card-description]:text-primary-foreground/80 **:data-[slot=card-title]:text-primary-foreground **:data-[slot=card-footer]:text-primary-foreground/70 **:data-[slot=card-action]:text-primary-foreground/70"
      />
      <MetricCard
        title="Expenditure (OPEX)"
        value={formatCurrency(data.expenses)}
        placeholderTrendLabel={trendPlaceholder}
        description="Total pengeluaran operasional"
        className="bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow"
      />
      <MetricCard
        title="Average Order Value"
        value={formatCurrency(data.aov)}
        placeholderTrendLabel={trendPlaceholder}
        description="Rata-rata nilai per transaksi"
        className="bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow"
      />
      <MetricCard
        title="Net Profit"
        value={formatCurrency(data.netProfit)}
        placeholderTrendLabel={trendPlaceholder}
        description="Revenue dikurangi Expenses"
        className="bg-linear-to-br from-secondary to-secondary/80 text-secondary-foreground shadow-xl shadow-secondary/25 border-none dark:from-secondary/80 dark:to-secondary/60 **:data-[slot=card-description]:text-secondary-foreground/80 **:data-[slot=card-title]:text-secondary-foreground **:data-[slot=card-footer]:text-secondary-foreground/70 **:data-[slot=card-action]:text-primary-foreground/70"
      />
    </div>
  );
}
