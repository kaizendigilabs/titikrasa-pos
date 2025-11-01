"use client";

import * as React from "react";
import { IconRefresh, IconSearch } from "@tabler/icons-react";
import Link from "next/link";

import { DataTableContent } from "@/components/data-table/table-content";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableSelectFilter } from "@/components/data-table/select-filter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useStoreIngredientsTableViewModel } from "@/features/inventory/store-ingredients/model/view-model";
import type { StoreIngredientListItem } from "@/features/inventory/store-ingredients/types";

import { StoreIngredientEditForm } from "./store-ingredient-edit-form";

const STATUS_OPTIONS: Array<{ label: string; value: "all" | "active" | "inactive" }> = [
  { label: "Semua", value: "all" },
  { label: "Aktif", value: "active" },
  { label: "Nonaktif", value: "inactive" },
];

type StoreIngredientsTableScreenProps = {
  initialItems: StoreIngredientListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: {
      search: string | null;
      status: "all" | "active" | "inactive";
      lowStockOnly: boolean;
    };
  };
  canManage: boolean;
};

export function StoreIngredientsTableScreen(props: StoreIngredientsTableScreenProps) {
  const vm = useStoreIngredientsTableViewModel(props);

  const handleSearchKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        vm.toolbar.search.apply();
      }
    },
    [vm],
  );

  const isEditOpen = vm.editDialog.isOpen && vm.editDialog.ingredient !== null;
  const editValues = vm.editDialog.form.values;
  const editErrors = vm.editDialog.form.errors;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border/60 bg-card px-4 py-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Cari bahan"
              value={vm.toolbar.search.term}
              onChange={(event) => vm.toolbar.search.setTerm(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-64"
            />
            <Button variant="secondary" size="sm" onClick={vm.toolbar.search.apply}>
              <IconSearch className="mr-2 h-4 w-4" />
              Cari
            </Button>
          </div>
          <DataTableSelectFilter
            value={vm.toolbar.status.value}
            onValueChange={(value) =>
              vm.toolbar.status.setValue(value as "all" | "active" | "inactive")
            }
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
          <div className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-1.5">
            <Checkbox
              id="low-stock-only"
              checked={vm.toolbar.lowStock.value}
              onCheckedChange={() => vm.toolbar.lowStock.toggle()}
            />
            <Label htmlFor="low-stock-only" className="text-sm font-medium text-muted-foreground">
              Hanya stok rendah
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => vm.refetch()}
            disabled={vm.isLoading}
          >
            <IconRefresh className={vm.isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Muat ulang
          </Button>
          <Button size="sm" asChild disabled={!vm.toolbar.canManage}>
            <Link href="/dashboard/inventory/stock-adjustments">Stock Opname</Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {vm.isSyncing ? (
          <span className="inline-flex items-center gap-1">
            <IconRefresh className="h-3 w-3 animate-spin" />
            Menyinkronkan data…
          </span>
        ) : (
          <span>{vm.pagination.total} bahan terdata</span>
        )}
        {vm.toolbar.search.term || vm.toolbar.status.value !== "all" || vm.toolbar.lowStock.value ? (
          <Button variant="ghost" size="sm" onClick={vm.toolbar.reset} className="text-muted-foreground">
            Reset filter
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border border-border/60 bg-card">
        <DataTableContent table={vm.table} isLoading={vm.isLoading} />
        <div className="border-t border-border/60 py-2">
          <DataTablePagination table={vm.table} />
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={(next) => {
        if (!next) {
          vm.editDialog.close();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit bahan</DialogTitle>
          </DialogHeader>
          {vm.editDialog.ingredient ? (
            <StoreIngredientEditForm
              values={editValues}
              errors={editErrors}
              isSubmitting={vm.editDialog.isSubmitting}
              onCancel={vm.editDialog.close}
              onSubmit={vm.editDialog.submit}
              onChange={vm.editDialog.form.setValue}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
