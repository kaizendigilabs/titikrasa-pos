"use client";

import { DateRangeType } from "@/lib/utils/date-helpers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface DateRangeFilterProps {
  value: DateRangeType;
  onChange: (value: DateRangeType) => void;
  className?: string;
}

const options: { label: string; value: DateRangeType }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
];

export default function DateRangeFilter({
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
