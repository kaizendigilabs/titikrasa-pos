"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/formatters";
import type { PaymentFormValues } from "./use-pos-controller";
import type { CartState } from "@/features/pos/cart-store";

type PaymentDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totals: { subtotal: number; discount: number; tax: number; grand: number };
  canSubmit: boolean;
  isSubmitting: boolean;
  mode: "customer" | "reseller";
  resellerName: string | null;
  paymentValues: PaymentFormValues;
  cart: CartState;
  onConfirm: () => void;
  onBypass: () => void;
  onPaymentStatusChange: (value: PaymentFormValues["paymentStatus"]) => void;
  onDueDateChange: (value: string) => void;
};

export function PaymentDrawer({
  open,
  onOpenChange,
  totals,
  canSubmit,
  isSubmitting,
  mode,
  resellerName,
  paymentValues,
  cart,
  onConfirm,
  onBypass,
  onPaymentStatusChange,
  onDueDateChange,
}: PaymentDrawerProps) {
  const isReseller = mode === "reseller";
  const changeDue =
    paymentValues.paymentMethod === "cash"
      ? Math.max(paymentValues.amountReceived - totals.grand, 0)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
          <DialogDescription>
            Pastikan detail transaksi dan total pembayaran sudah sesuai sebelum diselesaikan.
          </DialogDescription>
        </DialogHeader>

        {isReseller && resellerName ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">{resellerName}</p>
            <p className="text-xs text-amber-800">
              Pesanan reseller dapat ditandai sebagai <span className="font-semibold">Unpaid</span> bila belum dibayar.
            </p>
          </div>
        ) : null}

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <div className="space-y-3 rounded-2xl border border-muted-foreground/20 bg-background/70 p-4">
            <p className="text-sm font-semibold text-foreground">Ringkasan Item</p>
            {cart.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada item di keranjang.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {cart.lines.map((line) => (
                  <li key={line.lineId} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{line.menuName}</p>
                      {line.variantLabel ? (
                        <p className="text-xs text-muted-foreground">{line.variantLabel}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">Qty {line.qty}</p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatCurrency(line.unitPrice * line.qty)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 rounded-2xl border border-muted-foreground/20 bg-background/70 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase">
                Mode · {mode === "customer" ? "Customer" : "Reseller"}
              </span>
              {isReseller && resellerName ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                  {resellerName}
                </span>
              ) : null}
            </div>
            <p>
              Metode pembayaran: <span className="font-medium">{paymentValues.paymentMethod === "cash" ? "Cash" : "Transfer"}</span>
            </p>
            {isReseller ? (
              <p>
                Status pembayaran: <span className="font-medium">{paymentValues.paymentStatus === "paid" ? "Paid" : "Unpaid"}</span>
                {paymentValues.paymentStatus === "unpaid" && paymentValues.dueDate
                  ? ` · Jatuh tempo ${paymentValues.dueDate}`
                  : null}
              </p>
            ) : null}
            {paymentValues.customerName ? (
              <p>
                Customer: <span className="font-medium">{paymentValues.customerName}</span>
              </p>
            ) : null}
            {paymentValues.note ? (
              <p>
                Catatan: <span className="font-medium">{paymentValues.note}</span>
              </p>
            ) : null}
            {paymentValues.paymentMethod === "cash" ? (
              <p>
                Uang diterima: <span className="font-medium">{formatCurrency(paymentValues.amountReceived)}</span>
                {" "}· Kembalian {formatCurrency(changeDue)}
              </p>
            ) : null}
          </div>

          {isReseller ? (
            <div className="space-y-3 rounded-2xl border border-muted-foreground/20 bg-background/70 p-4">
              <div className="space-y-2">
                <Label>Status Pembayaran</Label>
                <Select
                  value={paymentValues.paymentStatus}
                  onValueChange={(value) =>
                    onPaymentStatusChange(value as PaymentFormValues["paymentStatus"])
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentValues.paymentStatus === "unpaid" ? (
                <div className="space-y-2">
                  <Label>Jatuh Tempo</Label>
                  <Input
                    type="date"
                    value={paymentValues.dueDate}
                    onChange={(event) => onDueDateChange(event.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2 rounded-2xl border border-muted-foreground/20 bg-card/90 p-4">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatCurrency(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Diskon</dt>
                <dd>-{formatCurrency(totals.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Tax</dt>
                <dd>{formatCurrency(totals.tax)}</dd>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-base font-semibold text-foreground">
                <dt>Total</dt>
                <dd>{formatCurrency(totals.grand)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Batalkan
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={onBypass}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Memproses..." : "Bypass Serve"}
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full text-base font-semibold"
            onClick={onConfirm}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Memproses..." : "Konfirmasi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
