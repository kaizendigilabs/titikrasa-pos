"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCreateSupplierLinkMutation } from "@/features/procurements/suppliers/hooks";
import { createSupplierLinkSchema } from "@/features/procurements/suppliers/schemas";

type StoreIngredientOption = {
  id: string;
  name: string;
  baseUom: string;
};

type CatalogLinkFormProps = {
  supplierId: string;
  catalogItemId: string;
  ingredients: StoreIngredientOption[];
  existingIngredientIds: Set<string>;
};

export function CatalogLinkForm({
  supplierId,
  catalogItemId,
  ingredients,
  existingIngredientIds,
}: CatalogLinkFormProps) {
  const router = useRouter();
  const createLinkMutation = useCreateSupplierLinkMutation(supplierId);

  const availableIngredients = React.useMemo(
    () => ingredients.filter((ingredient) => !existingIngredientIds.has(ingredient.id)),
    [ingredients, existingIngredientIds],
  );

  const form = useForm({
    defaultValues: {
      storeIngredientId: "",
      preferred: false,
    },
    onSubmit: async ({ value }) => {
      try {
        const payload = createSupplierLinkSchema.parse({
          supplierId,
          catalogItemId,
          storeIngredientId: value.storeIngredientId,
          preferred: value.preferred,
        });
        await createLinkMutation.mutateAsync(payload);
        toast.success("Ingredient linked");
        form.reset();
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to link ingredient";
        toast.error(message);
      }
    },
  });

  if (availableIngredients.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        All ingredients are already linked.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-wrap items-end gap-3 text-sm"
    >
      <form.Field name="storeIngredientId">
        {(field) => (
          <div className="flex min-w-[220px] flex-col gap-2">
            <Label htmlFor={`link-ingredient-${catalogItemId}`}>
              Store ingredient
            </Label>
            <select
              id={`link-ingredient-${catalogItemId}`}
              className="rounded-md border bg-background px-3 py-2"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
            >
              <option value="">Select ingredient</option>
              {availableIngredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} ({ingredient.baseUom})
                </option>
              ))}
            </select>
          </div>
        )}
      </form.Field>
      <form.Field name="preferred">
        {(field) => (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={field.state.value}
              onChange={(event) => field.handleChange(event.target.checked)}
            />
            Set as preferred
          </label>
        )}
      </form.Field>
      <Button
        type="submit"
        size="sm"
        disabled={
          createLinkMutation.isPending ||
          form.state.isSubmitting ||
          form.state.values.storeIngredientId.length === 0
        }
      >
        {createLinkMutation.isPending || form.state.isSubmitting ? "Linking…" : "Link ingredient"}
      </Button>
    </form>
  );
}
