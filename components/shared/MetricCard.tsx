import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface MetricCardProps {
  title: string;
  value: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
  description?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  trend,
  description,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("@container/card", className)}>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {trend && (
          <CardAction>
            <Badge variant="outline">
              {trend.isUp ? <IconTrendingUp /> : <IconTrendingDown />}
              {trend.value > 0 ? "+" : ""}
              {trend.value.toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {description && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {trend?.isUp ? "Trending up" : "Trending down"}{" "}
            {trend?.isUp ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">{description}</div>
        </CardFooter>
      )}
    </Card>
  );
}
