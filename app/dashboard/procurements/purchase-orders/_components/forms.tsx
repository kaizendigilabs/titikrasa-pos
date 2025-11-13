"use client";

import * as React from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  PurchaseOrderCatalogItem,
  PurchaseOrderSupplierOption,
  PurchaseOrderStatus,
} from "@/features/procurements/purchase-orders/types";
import { formatCurrency } from "@/lib/utils/formatters";

export type PurchaseOrderFormValues = {
  supplierId: string;
  status: PurchaseOrderStatus;
  items: Array<{ catalogItemId: string; qty: number }>;
};

export type PurchaseOrderCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PurchaseOrderFormValues) => Promise<void>;
  isSubmitting: boolean;
  suppliers: PurchaseOrderSupplierOption[];
  catalogItems: PurchaseOrderCatalogItem[];
  prefill?: {
    supplierId?: string;
    version?: number;
  };
};

const DEFAULT_ITEM = { catalogItemId: "", qty: 1 };

const DEFAULT_VALUES: PurchaseOrderFormValues = {
  supplierId: "",
  status: "draft",
  items: [{ ...DEFAULT_ITEM }],
};

const STATUS_OPTIONS: Array<{ label: string; value: PurchaseOrderStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Complete", value: "complete" },
];

export function PurchaseOrderCreateSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  suppliers,
  catalogItems,
  prefill,
}: PurchaseOrderCreateSheetProps) {
  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      await onSubmit(value as PurchaseOrderFormValues);
    },
  });

  const [supplierId, setSupplierId] = React.useState(DEFAULT_VALUES.supplierId);
  const [status, setStatus] = React.useState<PurchaseOrderStatus>("draft");
  const [itemRows, setItemRows] = React.useState<
    PurchaseOrderFormValues["items"]
  >(DEFAULT_VALUES.items);

  const supplierCatalogItems = React.useMemo(
    () =>
      catalogItems.filter(
        (item) => item.supplier_id === supplierId && item.is_active,
      ),
    [catalogItems, supplierId],
  );

  const grandTotal = React.useMemo(() => {
    return itemRows.reduce((total, item) => {
      const catalog = catalogItems.find((entry) => entry.id === item.catalogItemId);
      if (!catalog) return total;
      return total + item.qty * (catalog.purchase_price ?? 0);
    }, 0);
  }, [catalogItems, itemRows]);

  const resetFormState = React.useCallback(
    (nextSupplier?: string) => {
      const supplierValue = nextSupplier ?? DEFAULT_VALUES.supplierId;
      setSupplierId(supplierValue);
      setStatus(DEFAULT_VALUES.status);
      setItemRows([{ ...DEFAULT_ITEM }]);
      form.reset();
      form.setFieldValue("supplierId", supplierValue);
      form.setFieldValue("status", DEFAULT_VALUES.status);
      form.setFieldValue("items", [{ ...DEFAULT_ITEM }]);
    },
    [form],
  );

  React.useEffect(() => {
    resetFormState(prefill?.supplierId);
  }, [prefill?.version, resetFormState]);

  const updateItems = React.useCallback(
    (
      updater: (
        prev: PurchaseOrderFormValues["items"],
      ) => PurchaseOrderFormValues["items"],
    ) => {
      setItemRows((prev) => {
        const next = updater(prev);
        form.setFieldValue("items", next);
        return next;
      });
    },
    [form],
  );

  const handleSupplierChange = (value: string) => {
    setSupplierId(value);
    form.setFieldValue("supplierId", value);
    updateItems(() => [{ ...DEFAULT_ITEM }]);
  };

  const handleStatusChange = (value: PurchaseOrderStatus) => {
    setStatus(value);
    form.setFieldValue("status", value);
  };

  const updateItemField = (
    index: number,
    field: "catalogItemId" | "qty",
    value: string,
  ) => {
    updateItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === "catalogItemId") {
          return { ...item, catalogItemId: value };
        }
        const qtyNumber = Number(value);
        return {
          ...item,
          qty: Number.isFinite(qtyNumber) ? Math.max(1, Math.round(qtyNumber)) : 1,
        };
      }),
    );
  };

  const handleAddRow = () => {
    if (!supplierId || supplierCatalogItems.length === 0) return;
    updateItems((prev) => [...prev, { ...DEFAULT_ITEM }]);
  };

  const handleRemoveRow = (index: number) => {
    if (itemRows.length === 1) return;
    updateItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const hasValidItems = itemRows.every(
    (item) => item.catalogItemId && Number.isFinite(item.qty) && item.qty > 0,
  );
  const isBusy = isSubmitting || form.state.isSubmitting;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-3xl flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Buat Purchase Order</SheetTitle>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-6 overflow-y-auto px-1 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="po-supplier">Supplier</Label>
              <select
                id="po-supplier"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={supplierId}
                onChange={(event) => handleSupplierChange(event.target.value)}
                required
              >
                <option value="">Pilih supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id} disabled={!supplier.is_active}>
                    {supplier.name} {!supplier.is_active ? "(inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="po-status">Status awal</Label>
              <select
                id="po-status"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(event) =>
                  handleStatusChange(event.target.value as PurchaseOrderStatus)
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Items</h3>
                <p className="text-sm text-muted-foreground">
                  Pilih katalog dari supplier dan atur jumlah yang dibutuhkan.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                disabled={!supplierId || supplierCatalogItems.length === 0}
              >
                <IconPlus className="mr-2 size-4" />
                Tambah item
              </Button>
            </div>

            {!supplierId ? (
              <p className="text-sm text-muted-foreground">
                Pilih supplier terlebih dahulu untuk melihat daftar katalog.
              </p>
            ) : null}
            {supplierId && supplierCatalogItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Supplier ini belum memiliki katalog aktif.
              </p>
            ) : null}

            {itemRows.map((item, index) => {
              const catalog = catalogItems.find(
                (entry) => entry.id === item.catalogItemId,
              );
              const unitPrice = catalog?.purchase_price ?? 0;
              const lineTotal = item.qty * unitPrice;
              return (
                <div key={index} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Item {index + 1}</span>
                    {itemRows.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleRemoveRow(index)}
                      >
                        <IconTrash className="mr-1 size-4" />
                        Hapus
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Katalog</Label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={item.catalogItemId}
                        onChange={(event) =>
                          updateItemField(index, "catalogItemId", event.target.value)
                        }
                        disabled={!supplierId || supplierCatalogItems.length === 0}
                        required
                      >
                        <option value="">
                          {supplierCatalogItems.length ? "Pilih item" : "Katalog tidak tersedia"}
                        </option>
                        {supplierCatalogItems.map((catalogItem) => (
                          <option key={catalogItem.id} value={catalogItem.id}>
                            {catalogItem.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {catalog ? (
                      <div className="space-y-2">
                        <Label>Quantity ({catalog.base_uom.toUpperCase()})</Label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={item.qty}
                          onChange={(event) =>
                            updateItemField(index, "qty", event.target.value)
                          }
                        />
                        <div className="text-xs text-muted-foreground">
                          <div>Satuan: {formatCurrency(unitPrice / 100)}</div>
                          <div>Subtotal: {formatCurrency(lineTotal / 100)}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Pilih katalog terlebih dahulu.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Total perkiraan</span>
              <span className="text-base font-semibold">
                {formatCurrency(grandTotal / 100)}
              </span>
            </div>
          </div>

          <SheetFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={
                isBusy ||
                !supplierId ||
                supplierCatalogItems.length === 0 ||
                !hasValidItems
              }
            >
              {isBusy ? "Menyimpan..." : "Simpan purchase order"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
