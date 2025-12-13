"use client";

import { DateRangeType } from "@/lib/utils/date-helpers";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

interface DateRangeFilterProps {
  value: DateRangeType;
  onChange: (value: DateRangeType) => void;
  className?: string;
}

const options: { label: string; value: DateRangeType }[] = [
  { label: "Hari Ini", value: "today" },
  { label: "Minggu Ini", value: "week" },
  { label: "Bulan Ini", value: "month" },
  { label: "Tahun Ini", value: "year" },
];

export default function DateRangeFilter({
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  return (
    <div className={cn("w-[150px]", className)}>
        <Select
            value={value}
            onValueChange={(val) => onChange(val as DateRangeType)}
        >
            <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Pilih Rentang Waktu" />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
  );
}
