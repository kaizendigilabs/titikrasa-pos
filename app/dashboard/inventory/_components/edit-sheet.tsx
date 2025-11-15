"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { StoreIngredientListItem } from "@/features/inventory/store-ingredients/types";

export type StoreIngredientFormValues = {
  sku: string;
  minStock: string;
  isActive: boolean;
};

type StoreIngredientEditSheetProps = {
  ingredient: StoreIngredientListItem | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: StoreIngredientFormValues) => Promise<void>;
};

const buildDefaults = (
  ingredient: StoreIngredientListItem | null,
): StoreIngredientFormValues => ({
  sku: ingredient?.sku ?? "",
  minStock: ingredient ? String(ingredient.minStock ?? 0) : "0",
  isActive: ingredient?.isActive ?? true,
});

export function StoreIngredientEditSheet({
  ingredient,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: StoreIngredientEditSheetProps) {
  const form = useForm({
    defaultValues: buildDefaults(ingredient),
    onSubmit: async ({ value }) => {
      await onSubmit(value as StoreIngredientFormValues);
    },
  });

  React.useEffect(() => {
    form.reset(buildDefaults(ingredient));
  }, [form, ingredient]);

  const open = Boolean(ingredient);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Store Ingredient</SheetTitle>
        </SheetHeader>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="sku">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="ingredient-sku">SKU</Label>
                <Input
                  id="ingredient-sku"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Optional SKU"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="minStock">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="ingredient-min-stock">Minimum Stock</Label>
                <Input
                  id="ingredient-min-stock"
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 50"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  required
                />
              </div>
            )}
          </form.Field>

          <form.Field name="isActive">
            {(field) => (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ingredient-active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Nonaktifkan untuk menyembunyikan ingredient dari daftar.
                  </p>
                </div>
                <Switch
                  id="ingredient-active"
                  checked={field.state.value}
                  onCheckedChange={(checked) =>
                    field.handleChange(Boolean(checked))
                  }
                />
              </div>
            )}
          </form.Field>

          <SheetFooter>
            <Button type="submit" disabled={isSubmitting || !ingredient}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
