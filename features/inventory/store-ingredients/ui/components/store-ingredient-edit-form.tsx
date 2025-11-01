"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type {
  StoreIngredientFormErrors,
  StoreIngredientFormState,
} from "../../model/forms/state";

export type StoreIngredientEditFormProps = {
  values: StoreIngredientFormState;
  errors: StoreIngredientFormErrors;
  isSubmitting: boolean;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  onChange: <TKey extends keyof StoreIngredientFormState>(
    key: TKey,
    value: StoreIngredientFormState[TKey],
  ) => void;
};

export function StoreIngredientEditForm({
  values,
  errors,
  isSubmitting,
  onSubmit,
  onCancel,
  onChange,
}: StoreIngredientEditFormProps) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit();
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="ingredient-sku">SKU</Label>
        <Input
          id="ingredient-sku"
          value={values.sku}
          onChange={(event) => onChange("sku", event.target.value)}
          placeholder="SKU (opsional)"
        />
        {errors.sku ? (
          <p className="text-xs text-destructive">{errors.sku}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ingredient-min-stock">Minimum Stock</Label>
        <Input
          id="ingredient-min-stock"
          value={values.minStock}
          onChange={(event) =>
            onChange(
              "minStock",
              event.target.value.replace(/[^0-9]/g, ""),
            )
          }
          inputMode="numeric"
          pattern="[0-9]*"
          required
        />
        {errors.minStock ? (
          <p className="text-xs text-destructive">{errors.minStock}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="ingredient-active"
          checked={values.isActive}
          onCheckedChange={(value) => onChange("isActive", Boolean(value))}
        />
        <Label htmlFor="ingredient-active" className="text-sm font-medium">
          Ingredient aktif
        </Label>
      </div>

      {errors.form ? (
        <p className="text-xs text-destructive">{errors.form}</p>
      ) : null}

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}
