"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { IconDotsVertical, IconLoader2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

type LabelAction<TData> = {
  type: "label";
  label: React.ReactNode | ((row: TData) => React.ReactNode);
};

type SeparatorAction = {
  type: "separator";
};

type ItemAction<TData> = {
  type?: "item";
  label: React.ReactNode | ((row: TData) => React.ReactNode);
  onSelect: (row: TData) => void;
  disabled?: boolean | ((row: TData) => boolean);
  destructive?: boolean;
  isPending?: (row: TData) => boolean;
  pendingLabel?: React.ReactNode | ((row: TData) => React.ReactNode);
  hidden?: (row: TData) => boolean;
};

export type ActionMenuItem<TData> =
  | LabelAction<TData>
  | SeparatorAction
  | ItemAction<TData>;

export type ActionColumnOptions<TData> = {
  id?: string;
  header?: React.ReactNode;
  triggerLabel?: string;
  getIsRowPending?: (row: TData) => boolean;
  actions: ActionMenuItem<TData>[];
};

function resolveNode<TData>(
  value: React.ReactNode | ((row: TData) => React.ReactNode),
  row: TData,
) {
  return typeof value === "function" ? value(row) : value;
}

function resolveDisabled<TData>(
  value: boolean | ((row: TData) => boolean) | undefined,
  row: TData,
) {
  if (typeof value === "function") {
    return value(row);
  }
  return value ?? false;
}

export function createActionColumn<TData>({
  id = "actions",
  header,
  triggerLabel = "Open menu",
  getIsRowPending,
  actions,
}: ActionColumnOptions<TData>): ColumnDef<TData> {
  return {
    id,
    header: header ? () => header : undefined,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      const item = row.original;
      const rowPending = getIsRowPending?.(item) ?? false;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={rowPending}
            >
              <span className="sr-only">{triggerLabel}</span>
              {rowPending ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconDotsVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action, index) => {
              if (action.type === "separator") {
                return <DropdownMenuSeparator key={`separator-${index}`} />;
              }

              if (action.type === "label") {
                return (
                  <DropdownMenuLabel key={`label-${index}`}>
                    {resolveNode(action.label, item)}
                  </DropdownMenuLabel>
                );
              }

              if (action.hidden?.(item)) {
                return null;
              }

              const isPending = action.isPending?.(item) ?? false;
              const disabled =
                rowPending || resolveDisabled(action.disabled, item);
              const pendingLabel =
                action.pendingLabel ?? action.label ?? "Processing…";

              return (
                <DropdownMenuItem
                  key={`item-${index}`}
                  onClick={() => {
                    if (!disabled) {
                      action.onSelect(item);
                    }
                  }}
                  disabled={disabled}
                  className={cn(
                    action.destructive
                      ? "text-destructive focus:text-destructive"
                      : undefined,
                  )}
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      {resolveNode(pendingLabel, item)}
                    </span>
                  ) : (
                    resolveNode(action.label, item)
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };
}
