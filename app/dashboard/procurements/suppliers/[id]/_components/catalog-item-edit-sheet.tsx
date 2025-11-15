"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type {
  StoreIngredientOption,
  SupplierCatalogWithLinks,
} from "@/features/procurements/suppliers/types";
import {
  useUpdateCatalogItemMutation,
} from "@/features/procurements/suppliers/hooks";
import {
  updateCatalogItemSchema,
  type UpdateCatalogItemPayload,
} from "@/features/procurements/suppliers/schemas";
import { CatalogLinkForm } from "../../CatalogLinkForm";
import { CatalogLinkEntry } from "../../CatalogLinkEntry";

const BASE_UOMS = ["gr", "ml", "pcs"] as const;

type CatalogItemEditSheetProps = {
  supplierId: string;
  item: SupplierCatalogWithLinks;
  storeIngredients: StoreIngredientOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CatalogItemEditSheet({
  supplierId,
  item,
  storeIngredients,
  open,
  onOpenChange,
}: CatalogItemEditSheetProps) {
  const router = useRouter();
  const updateMutation = useUpdateCatalogItemMutation(supplierId);

  const form = useForm({
    defaultValues: {
      name: item.name,
      baseUom: BASE_UOMS.includes(item.base_uom as any) ? item.base_uom : "gr",
      purchasePrice: String(item.purchase_price),
    },
    onSubmit: async ({ value }) => {
      try {
        const payload = updateCatalogItemSchema.parse({
          name: value.name.trim(),
          baseUom: value.baseUom,
          purchasePrice: Number(value.purchasePrice || "0"),
        }) satisfies UpdateCatalogItemPayload;
        await updateMutation.mutateAsync({ catalogItemId: item.id, payload });
        toast.success("Catalog item updated");
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update item";
        toast.error(message);
      }
    },
  });

  React.useEffect(() => {
    form.reset();
    form.setFieldValue("name", item.name);
    form.setFieldValue(
      "baseUom",
      BASE_UOMS.includes(item.base_uom as any) ? item.base_uom : "gr",
    );
    form.setFieldValue("purchasePrice", String(item.purchase_price));
  }, [form, item]);

  const existingIngredientIds = React.useMemo(
    () => new Set(item.links?.map((link) => link.storeIngredientId) ?? []),
    [item.links],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edit Catalog Item</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="catalog-edit-name">Item name</Label>
                  <Input
                    id="catalog-edit-name"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    required
                  />
                </div>
              )}
            </form.Field>
            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="baseUom">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="catalog-edit-base-uom">Base UOM</Label>
                    <select
                      id="catalog-edit-base-uom"
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
              <form.Field name="purchasePrice">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="catalog-edit-price">Purchase price (IDR)</Label>
                    <Input
                      id="catalog-edit-price"
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
            </div>
            <SheetFooter>
              <Button
                type="submit"
                disabled={updateMutation.isPending || form.state.isSubmitting}
              >
                {updateMutation.isPending || form.state.isSubmitting
                  ? "Saving…"
                  : "Save changes"}
              </Button>
            </SheetFooter>
          </form>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Linked Ingredients
              </h3>
              <p className="text-xs text-muted-foreground">
                Hubungkan bahan ini dengan store ingredient untuk update stok otomatis.
              </p>
            </div>
            <div className="space-y-3">
              {item.links?.length ? (
                item.links.map((link) => (
                  <CatalogLinkEntry key={link.id} supplierId={supplierId} link={link} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Belum ada ingredient yang terhubung.
                </p>
              )}
              <CatalogLinkForm
                supplierId={supplierId}
                catalogItemId={item.id}
                ingredients={storeIngredients}
                existingIngredientIds={existingIngredientIds}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
