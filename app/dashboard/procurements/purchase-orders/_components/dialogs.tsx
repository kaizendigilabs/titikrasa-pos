"use client";

import * as React from "react";
import { IconLoader2 } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  PurchaseOrderCatalogItem,
  PurchaseOrderListItem,
  PurchaseOrderStatus,
} from "@/features/procurements/purchase-orders/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";

export type PurchaseOrderDetailDialogProps = {
  order: PurchaseOrderListItem | null;
  onClose: () => void;
  catalogItems: PurchaseOrderCatalogItem[];
  canManage: boolean;
  onStatusChange: (status: PurchaseOrderStatus) => void;
  pendingStatus?: PurchaseOrderStatus | null;
  onDelete?: () => void;
  isDeleting?: boolean;
};

export type PurchaseOrderDeleteDialogProps = {
  order: PurchaseOrderListItem | null;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
};

function renderStatusBadge(status: PurchaseOrderStatus) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "pending":
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
          Pending
        </Badge>
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

export function PurchaseOrderDetailDialog({
  order,
  onClose,
  catalogItems,
  canManage,
  onStatusChange,
  pendingStatus,
  onDelete,
  isDeleting,
}: PurchaseOrderDetailDialogProps) {
  const catalogMap = React.useMemo(
    () =>
      new Map<string, PurchaseOrderCatalogItem>(
        catalogItems.map((item) => [item.id, item]),
      ),
    [catalogItems],
  );

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Purchase Order</DialogTitle>
          <DialogDescription>
            Tinjau item dan ubah status ketika barang diterima.
          </DialogDescription>
        </DialogHeader>
        {order ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {order.id}
              </span>
              {renderStatusBadge(order.status)}
            </div>

            <div className="grid gap-4 rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase">Issued at</p>
                <p className="font-medium">
                  {order.issued_at ? formatDateTime(order.issued_at) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase">Completed at</p>
                <p className="font-medium">
                  {order.completed_at ? formatDateTime(order.completed_at) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase">Total items</p>
                <p className="font-medium">{order.items.length}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-left">Qty</th>
                    <th className="px-4 py-2 text-right">Unit price</th>
                    <th className="px-4 py-2 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items.map((item, index) => {
                    const catalog = catalogMap.get(item.catalogItemId);
                    const ingredientName =
                      catalog?.links?.find(
                        (link) => link.storeIngredientId === item.storeIngredientId,
                      )?.ingredientName ?? item.storeIngredientId;
                    const unitPrice = item.price ?? catalog?.purchase_price ?? 0;
                    return (
                      <tr key={`${item.catalogItemId}-${index}`}>
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {catalog?.name ?? item.catalogItemId}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Ingredient: {ingredientName ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {item.qty} {item.baseUom}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(unitPrice / 100)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency((unitPrice * item.qty) / 100)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {order && canManage ? (
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <IconLoader2 className="size-4 animate-spin" />
                  Deleting…
                </span>
              ) : (
                "Delete PO"
              )}
            </Button>
            <div className="flex flex-wrap gap-2">
              {(["draft", "pending", "complete"] as PurchaseOrderStatus[]).map(
                (nextStatus) => (
                  <Button
                    key={nextStatus}
                    type="button"
                    variant={
                      order.status === nextStatus ? "default" : "outline"
                    }
                    onClick={() => onStatusChange(nextStatus)}
                    disabled={pendingStatus === nextStatus}
                  >
                    {pendingStatus === nextStatus ? (
                      <span className="flex items-center gap-2">
                        <IconLoader2 className="size-4 animate-spin" />
                        Updating…
                      </span>
                    ) : (
                      nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)
                    )}
                  </Button>
                ),
              )}
            </div>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function PurchaseOrderDeleteDialog({
  order,
  onCancel,
  onConfirm,
  isPending,
}: PurchaseOrderDeleteDialogProps) {
  return (
    <AlertDialog open={Boolean(order)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus purchase order?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Purchase order{" "}
            <span className="font-mono text-xs">{order?.id}</span> akan dihapus
            permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <IconLoader2 className="size-4 animate-spin" />
                Menghapus…
              </span>
            ) : (
              "Hapus"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
