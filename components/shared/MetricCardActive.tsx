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
  placeholderTrendLabel?: string;
  description?: string;
  className?: string;
}

export function MetricCardActive({
  title,
  value,
  trend,
  placeholderTrendLabel,
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
            <Badge variant="outline" className="bg-white text-primary">
              {trend.isUp ? <IconTrendingUp /> : <IconTrendingDown />}
              {trend.value > 0 ? "+" : ""}
              {trend.value.toFixed(1)}%
            </Badge>
          </CardAction>
        )}
        {!trend && placeholderTrendLabel && (
          <CardAction>
            <Badge variant="outline" className="bg-white text-primary">{placeholderTrendLabel}</Badge>
          </CardAction>
        )}
      </CardHeader>
      {description && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {trend ? (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {trend.isUp ? "Trending up" : "Trending down"}{" "}
              {trend.isUp ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
            </div>
          ) : (
            placeholderTrendLabel && (
              <div className="text-primary-foreground">{placeholderTrendLabel}</div>
            )
          )}
          <div className="text-primary-foreground">{description}</div>
        </CardFooter>
      )}
    </Card>
  );
}
