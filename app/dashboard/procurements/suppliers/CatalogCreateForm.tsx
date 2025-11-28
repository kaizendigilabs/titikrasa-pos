'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCatalogItemSchema,
  type CreateCatalogItemPayload,
} from "@/features/procurements/suppliers/schemas";
import { useCreateCatalogItemMutation } from "@/features/procurements/suppliers/hooks";

const DEFAULT_STATE = {
  name: "",
  baseUom: "gr",
  purchasePrice: "0",
};

const BASE_UOMS = ['gr', 'ml', 'pcs'] as const;

type CatalogCreateFormProps = {
  supplierId: string;
  onSuccess?: () => void;
};

export function CatalogCreateForm({ supplierId, onSuccess }: CatalogCreateFormProps) {
  const router = useRouter();
  const createMutation = useCreateCatalogItemMutation(supplierId);
  const form = useForm({
    defaultValues: DEFAULT_STATE,
    onSubmit: async ({ value }) => {
      try {
        const payload = createCatalogItemSchema.parse({
          supplierId,
          name: value.name.trim(),
          baseUom: value.baseUom,
          purchasePrice: Number(value.purchasePrice || "0"),
          isActive: true,
        }) satisfies CreateCatalogItemPayload;
        await createMutation.mutateAsync(payload);
        toast.success("Catalog item added");
        form.reset();
        router.refresh();
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create catalog item";
        toast.error(message);
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor="catalog-name">Item name</Label>
              <Input
                id="catalog-name"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                required
              />
            </div>
          )}
        </form.Field>
        <form.Field name="baseUom">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor="catalog-base-uom">Base UOM</Label>
              <select
                id="catalog-base-uom"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
              >
                {BASE_UOMS.map((uom) => (
                  <option key={uom} value={uom}>
                    {uom.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form.Field>
      </div>
      <form.Field name="purchasePrice">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="catalog-price">Purchase price (IDR)</Label>
            <Input
              id="catalog-price"
              type="text"
              inputMode="decimal"
              placeholder="Contoh: 185000"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              required
            />
          </div>
        )}
      </form.Field>
      <div className="flex justify-end border-t pt-4">
        <Button
          type="submit"
          disabled={createMutation.isPending || form.state.isSubmitting}
        >
          {createMutation.isPending || form.state.isSubmitting ? "Adding…" : "Add item"}
        </Button>
      </div>
    </form>
  );
}
