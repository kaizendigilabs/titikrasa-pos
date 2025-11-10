"use client";

import * as React from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

import {
  DataTableSelectFilter,
  type DataTableSelectFilterConfig,
} from "./data-table-select-filter";

type ToolbarSearchConfig = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

type ToolbarStatusConfig = {
  isLoading?: boolean;
  isSyncing?: boolean;
  syncingLabel?: string;
};

type ToolbarResetConfig = {
  onReset: () => void;
  visible?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
};

type SelectFilterConfig = DataTableSelectFilterConfig<string> & {
  type: "select";
};

type CustomFilterConfig = {
  type: "custom";
  id: string;
  element: React.ReactNode;
};

export type DataTableToolbarFilter = SelectFilterConfig | CustomFilterConfig;

export type DataTableToolbarBulkAction = {
  id: string;
  label: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export type DataTableToolbarBulkActions = {
  selectedCount: number;
  actions: DataTableToolbarBulkAction[];
  triggerLabel?: string;
  disabled?: boolean;
  minSelection?: number;
  isPending?: boolean;
};

export type DataTableToolbarProps = {
  search?: ToolbarSearchConfig;
  filters?: DataTableToolbarFilter[];
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  additionalControls?: React.ReactNode;
  bulkActions?: DataTableToolbarBulkActions;
  reset?: ToolbarResetConfig;
  status?: ToolbarStatusConfig;
  className?: string;
  children?: React.ReactNode;
};

export function DataTableToolbar({
  search,
  filters = [],
  primaryAction,
  secondaryActions,
  additionalControls,
  bulkActions,
  reset,
  status,
  className,
  children,
}: DataTableToolbarProps) {
  const syncingLabel = status?.syncingLabel ?? "Syncing…";
  const shouldShowBulk =
    bulkActions &&
    bulkActions.actions.length > 0 &&
    bulkActions.selectedCount >= (bulkActions.minSelection ?? 1);

  return (
    <div className={cn("w-full px-4 py-4 lg:px-6", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {search ? (
          <Input
            placeholder={search.placeholder ?? "Search"}
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            className="max-w-sm"
            disabled={search.disabled}
          />
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {status?.isSyncing ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconLoader2 className="size-3 animate-spin" />
              {syncingLabel}
            </div>
          ) : null}

          {reset?.visible ? (
            <Button
              variant="outline"
              className="text-muted-foreground"
              onClick={reset.onReset}
              disabled={reset.disabled}
              aria-label={reset["aria-label"] ?? "Reset filters"}
            >
              <IconX className="size-4" />
            </Button>
          ) : null}

          {filters.map((filter) => {
            if (filter.type === "custom") {
              return <React.Fragment key={filter.id}>{filter.element}</React.Fragment>;
            }
            return (
              <DataTableSelectFilter
                key={filter.id}
                value={filter.value}
                onValueChange={filter.onValueChange}
                options={filter.options}
                placeholder={filter.placeholder}
                className={filter.className}
                disabled={filter.disabled}
              />
            );
          })}

          {secondaryActions}

          {primaryAction}

          {shouldShowBulk ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={bulkActions?.disabled || bulkActions?.isPending}
                  className="min-w-[140px]"
                >
                  {bulkActions?.triggerLabel ?? "Bulk Actions"}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({bulkActions?.selectedCount ?? 0})
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {bulkActions?.selectedCount ?? 0} selected
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {bulkActions?.actions.map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => {
                      if (!action.disabled) {
                        action.onSelect();
                      }
                    }}
                    disabled={action.disabled}
                    className={cn(
                      action.destructive
                        ? "text-destructive focus:text-destructive"
                        : undefined,
                    )}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {additionalControls}
        </div>
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
