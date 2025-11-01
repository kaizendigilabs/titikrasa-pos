"use client";

import * as React from "react";
import { IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { PurchaseOrderStatus } from "@/features/procurements/purchase-orders/model/forms/schema";
import type { SheetController } from "@/features/procurements/purchase-orders/model/view-model";

const STATUS_OPTIONS: Array<{ label: string; value: PurchaseOrderStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Complete", value: "complete" },
];

type PurchaseOrderFormProps = {
  controller: SheetController;
};

export function PurchaseOrderForm({ controller }: PurchaseOrderFormProps) {
  const {
    values,
    errors,
    suppliers,
    activeCatalogItems,
    catalogItems,
    onSupplierChange,
    onStatusChange,
    onIssuedAtChange,
    onItemChange,
    addItem,
    removeItem,
    submit,
    isSubmitting,
  } = controller;

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await submit();
    },
    [submit],
  );

  const catalogLookup = React.useMemo(() => {
    const map = new Map<string, (typeof catalogItems)[number]>();
    for (const item of catalogItems) {
      map.set(item.id, item);
    }
    return map;
  }, [catalogItems]);

  const grandTotal = React.useMemo(() => {
    return values.items.reduce((sum, item) => {
      const catalog = catalogLookup.get(item.catalogItemId);
      const qty = Number.parseInt(item.qty || "0", 10);
      if (!catalog || Number.isNaN(qty)) return sum;
      return sum + Math.max(qty, 0) * (catalog.purchasePrice ?? 0);
    }, 0);
  }, [catalogLookup, values.items]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={values.status === option.value ? "default" : "outline"}
              onClick={() => onStatusChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {errors.status ? (
          <p className="text-xs text-destructive">{errors.status}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="po-supplier">Supplier</Label>
        <select
          id="po-supplier"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={values.supplierId}
          onChange={(event) => onSupplierChange(event.target.value)}
          required
        >
          <option value="">Pilih supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id} disabled={!supplier.isActive}>
              {supplier.name}
              {!supplier.isActive ? " (nonaktif)" : ""}
            </option>
          ))}
        </select>
        {errors.supplierId ? (
          <p className="text-xs text-destructive">{errors.supplierId}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="po-issued-at">Tanggal terbit (opsional)</Label>
        <Input
          id="po-issued-at"
          type="date"
          value={values.issuedAt}
          onChange={(event) => onIssuedAtChange(event.target.value)}
        />
        {errors.issuedAt ? (
          <p className="text-xs text-destructive">{errors.issuedAt}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        {values.items.map((item, index) => {
          const catalog = catalogLookup.get(item.catalogItemId ?? "");
          const qtyNumber = Number.parseInt(item.qty || "0", 10);
          const unitPrice = catalog?.purchasePrice ?? 0;
          const lineTotal = !Number.isNaN(qtyNumber) && qtyNumber > 0 ? qtyNumber * unitPrice : 0;
          const itemErrors = errors.items?.[index];

          return (
            <div key={index} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Item {index + 1}</p>
                  {catalog ? (
                    <p className="text-xs text-muted-foreground">
                      Unit price: Rp {Intl.NumberFormat("id-ID").format(unitPrice / 100)}
                    </p>
                  ) : null}
                </div>
                {values.items.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeItem(index)}
                  >
                    <IconTrash className="mr-2 h-4 w-4" /> Hapus
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Item katalog</Label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={item.catalogItemId}
                    onChange={(event) => onItemChange(index, "catalogItemId", event.target.value)}
                    disabled={!values.supplierId || activeCatalogItems.length === 0}
                    required
                  >
                    <option value="">
                      {values.supplierId
                        ? activeCatalogItems.length
                          ? "Pilih item"
                          : "Tidak ada item aktif"
                        : "Pilih supplier terlebih dahulu"}
                    </option>
                    {activeCatalogItems.map((catalogItem) => (
                      <option key={catalogItem.id} value={catalogItem.id}>
                        {catalogItem.name}
                      </option>
                    ))}
                  </select>
                  {itemErrors?.catalogItemId ? (
                    <p className="text-xs text-destructive">{itemErrors.catalogItemId}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>
                    Jumlah {catalog ? `(${catalog.baseUom})` : ""}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={item.qty}
                    onChange={(event) => onItemChange(index, "qty", event.target.value)}
                  />
                  {itemErrors?.qty ? (
                    <p className="text-xs text-destructive">{itemErrors.qty}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Line total: Rp {Intl.NumberFormat("id-ID").format(lineTotal / 100)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          disabled={!values.supplierId || activeCatalogItems.length === 0}
        >
          Tambah item
        </Button>
        {errors.items?.some((entry) => entry.catalogItemId || entry.qty) ? (
          <p className="text-xs text-destructive">
            Periksa kembali pilihan item dan jumlah pesanan.
          </p>
        ) : null}
      </div>

      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Total katalog</span>
          <span>{values.items.length}</span>
        </div>
        <div className="mt-2 flex items-center justify-between font-medium text-foreground">
          <span>Perkiraan nilai PO</span>
          <span>Rp {Intl.NumberFormat("id-ID").format(grandTotal / 100)}</span>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan…" : "Simpan purchase order"}
      </Button>
    </form>
  );
}
