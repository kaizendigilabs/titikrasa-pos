import { MetricCard } from '@/components/shared/MetricCard';
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
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(data.revenue)}
        description="Total revenue for selected period"
      />
      <MetricCard
        title="Expenditure (OPEX)"
        value={formatCurrency(data.expenses)}
        description="Total operational expenses"
      />
      <MetricCard
        title="Average Order Value"
        value={formatCurrency(data.aov)}
        description="Average value per order"
      />
      <MetricCard
        title="Net Profit"
        value={formatCurrency(data.netProfit)}
        description="Revenue minus expenses"
      />
    </div>
  );
}
