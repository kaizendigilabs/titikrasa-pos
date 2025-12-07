"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type StoreIngredientCreateValues = {
  name: string;
  baseUom: string;
  minStock: string;
  sku: string;
};

type StoreIngredientCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: StoreIngredientCreateValues) => Promise<void>;
  isSubmitting: boolean;
};

const DEFAULT_VALUES: StoreIngredientCreateValues = {
  name: "",
  baseUom: "gr",
  minStock: "0",
  sku: "",
};

const BASE_UOM_OPTIONS = ["gr", "ml", "pcs"] as const;

export function StoreIngredientCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: StoreIngredientCreateDialogProps) {
  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      await onSubmit(value as StoreIngredientCreateValues);
      form.reset();
    },
  });

  React.useEffect(() => {
    if (!open) form.reset();
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Store Ingredient</DialogTitle>
        </DialogHeader>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="ingredient-name">Nama</Label>
                <Input
                  id="ingredient-name"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Contoh: Gula Pasir"
                  required
                />
              </div>
            )}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="baseUom">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="ingredient-uom">Base UOM</Label>
                  <select
                    id="ingredient-uom"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                  >
                    {BASE_UOM_OPTIONS.map((uom) => (
                      <option key={uom} value={uom}>
                        {uom.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form.Field>

            <form.Field name="minStock">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="ingredient-min">Minimum Stock</Label>
                  <Input
                    id="ingredient-min"
                    type="text"
                    inputMode="numeric"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Contoh: 100"
                    required
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="sku">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="ingredient-sku">SKU (opsional)</Label>
                <Input
                  id="ingredient-sku"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="SKU internal"
                />
              </div>
            )}
          </form.Field>

          <DialogFooter className="mt-2">
            <Button type="submit" disabled={isSubmitting || form.state.isSubmitting}>
              {isSubmitting || form.state.isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
