"use client";

import * as React from "react";
import {
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";

import { DataTableContent } from "@/components/data-table/table-content";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableSelectFilter } from "@/components/data-table/select-filter";
import { AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { PurchaseOrderCatalogItem, PurchaseOrderSupplier } from "@/features/procurements/purchase-orders/model/view-model";
import { usePurchaseOrdersTableViewModel } from "@/features/procurements/purchase-orders/model/view-model";
import type { PurchaseOrderListItem } from "@/features/procurements/purchase-orders/types";
import type { PurchaseOrderStatus } from "@/features/procurements/purchase-orders/model/forms/schema";

import { PurchaseOrderForm } from "./purchase-order-form";

const STATUS_FILTERS: Array<{ label: string; value: "all" | PurchaseOrderStatus }> = [
  { label: "Semua", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Complete", value: "complete" },
];

type PurchaseOrdersTableScreenProps = {
  initialItems: PurchaseOrderListItem[];
  initialMeta: {
    pagination: { page: number; pageSize: number; total: number };
    filters: { status: "all" | PurchaseOrderStatus; search: string | null };
  } | null;
  suppliers: PurchaseOrderSupplier[];
  catalogItems: PurchaseOrderCatalogItem[];
  canManage: boolean;
};

function renderStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "pending":
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>
      );
    case "complete":
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
          Complete
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

export function PurchaseOrdersTableScreen(props: PurchaseOrdersTableScreenProps) {
  const vm = usePurchaseOrdersTableViewModel(props);
  const { toolbar, sheet, detail } = vm;
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleSheetChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        sheet.close();
      }
    },
    [sheet],
  );

  const handleDetailChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        detail.close();
      }
    },
    [detail],
  );

  const selectedPurchaseOrder = detail.purchaseOrder;
  const catalogLookup = React.useMemo(() => {
    const map = new Map<string, PurchaseOrderCatalogItem>();
    for (const item of props.catalogItems) {
      map.set(item.id, item);
    }
    return map;
  }, [props.catalogItems]);

  const supplierLookup = React.useMemo(() => {
    const map = new Map<string, PurchaseOrderSupplier>();
    for (const supplier of props.suppliers) {
      map.set(supplier.id, supplier);
    }
    return map;
  }, [props.suppliers]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari purchase order"
              value={toolbar.search.term}
              onChange={(event) => toolbar.search.setTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  toolbar.search.apply();
                }
              }}
            />
          </div>
          <Button variant="secondary" onClick={toolbar.search.apply} disabled={vm.isLoading}>
            Cari
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => vm.refetch()}
            disabled={vm.isLoading}
          >
            <IconRefresh className={vm.isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DataTableSelectFilter
            value={toolbar.status.value}
            onValueChange={(value) =>
              toolbar.status.setValue(value as "all" | PurchaseOrderStatus)
            }
            options={STATUS_FILTERS}
            placeholder="Status"
          />
          {toolbar.canManage ? (
            <Button onClick={sheet.open}>
              <IconPlus className="mr-2 h-4 w-4" />
              Purchase order baru
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {vm.isSyncing ? (
          <span className="inline-flex items-center gap-1">
            <IconLoader2 className="h-3 w-3 animate-spin" /> Sinkronisasi data…
          </span>
        ) : (
          <span>{vm.totalCount} purchase order</span>
        )}
        {(toolbar.search.term || toolbar.status.value !== "all") && (
          <Button variant="ghost" size="sm" onClick={toolbar.reset}>
            Reset filter
          </Button>
        )}
      </div>

      <DataTableContent table={vm.table} isLoading={vm.isLoading} />
      <DataTablePagination table={vm.table} />

      <Sheet open={sheet.isOpen} onOpenChange={handleSheetChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Buat purchase order</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <PurchaseOrderForm controller={sheet} />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(selectedPurchaseOrder)} onOpenChange={handleDetailChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail purchase order</DialogTitle>
            <DialogDescription>
              Tinjau item dan perbarui status ketika barang telah diterima.
            </DialogDescription>
          </DialogHeader>
          {selectedPurchaseOrder ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-mono text-sm text-muted-foreground">
                    {selectedPurchaseOrder.id}
                  </span>
                  <div className="text-sm text-muted-foreground">
                    Supplier:{" "}
                    {(() => {
                      const firstCatalog = selectedPurchaseOrder.items[0]
                        ? catalogLookup.get(selectedPurchaseOrder.items[0].catalogItemId)
                        : null;
                      if (!firstCatalog) return "-";
                      return supplierLookup.get(firstCatalog.supplierId)?.name ?? "-";
                    })()}
                  </div>
                </div>
                {renderStatusBadge(selectedPurchaseOrder.status)}
              </div>

              <div className="overflow-hidden rounded-md border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-left">Qty</th>
                      <th className="px-4 py-2 text-left">Harga</th>
                      <th className="px-4 py-2 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedPurchaseOrder.items.map((item) => {
                      const catalog = catalogLookup.get(item.catalogItemId);
                      const lineTotal = item.qty * item.price;
                      return (
                        <tr key={`${item.catalogItemId}-${item.storeIngredientId}`}>
                          <td className="px-4 py-2">
                            <div className="flex flex-col">
                              <span>{catalog?.name ?? item.catalogItemId}</span>
                              <span className="text-xs text-muted-foreground">
                                Ingredient: {
                                  catalog?.links.find(
                                    (link) => link.storeIngredientId === item.storeIngredientId,
                                  )?.ingredientName ?? item.storeIngredientId
                                }
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            {item.qty} {item.baseUom}
                          </td>
                          <td className="px-4 py-2">
                            Rp {Intl.NumberFormat("id-ID").format(item.price / 100)}
                          </td>
                          <td className="px-4 py-2 font-medium">
                            Rp {Intl.NumberFormat("id-ID").format(lineTotal / 100)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {selectedPurchaseOrder && props.canManage ? (
            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={detail.isDeleting}>
                    {detail.isDeleting ? "Menghapus…" : "Hapus purchase order"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus purchase order?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan. Purchase order dan histori
                      terkait akan dihapus secara permanen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await detail.delete();
                        setDeleteDialogOpen(false);
                      }}
                      disabled={detail.isDeleting}
                    >
                      {detail.isDeleting ? "Menghapus…" : "Hapus"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex flex-wrap gap-2">
                {(["draft", "pending", "complete"] as PurchaseOrderStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={selectedPurchaseOrder.status === status ? "default" : "outline"}
                    onClick={() => detail.updateStatus(status)}
                    disabled={detail.isUpdating}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
