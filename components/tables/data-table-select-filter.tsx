"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

type Option<T extends string> = {
  label: string;
  value: T;
};

type DataTableSelectFilterProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: Option<T>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function DataTableSelectFilter<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
}: DataTableSelectFilterProps<T>) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as T)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-32", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
