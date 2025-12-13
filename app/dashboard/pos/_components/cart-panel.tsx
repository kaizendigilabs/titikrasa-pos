"use client";

import * as React from "react";
import { IconMinus, IconPlus, IconTrash, IconCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CartState } from "@/features/pos/cart-store";
import type { PaymentFormValues } from "./use-pos-controller";
import { formatCurrency } from "@/lib/utils/formatters";
import type { ResellerListItem } from "@/features/resellers/types";
import { cn } from "@/lib/utils/cn";

type CartPanelProps = {
  className?: string;
  cart: CartState;
  subtotal: number;
  discountAmount: number;
  tax: number;
  defaultTaxRate: number;
  grandTotal: number;
  onChangeQuantity: (lineId: string, qty: number) => void;
  onRemove: (lineId: string) => void;
  onOpenPayment: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  paymentValues: PaymentFormValues;
  mode: "customer" | "reseller";
  onModeChange: (mode: "customer" | "reseller") => void;
  resellers: ResellerListItem[];
  selectedResellerId: string | null;
  onSelectReseller: (id: string) => void;
  resellerQuery: string;
  onResellerQueryChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentFormValues["paymentMethod"]) => void;
  onAmountReceivedChange: (value: number) => void;
  onNoteChange: (value: string) => void;
  isLoading?: boolean;
};

export function CartPanel({
  className,
  cart,
  subtotal,
  discountAmount,
  tax,
  defaultTaxRate,
  grandTotal,
  onChangeQuantity,
  onRemove,
  onOpenPayment,
  canSubmit,
  isSubmitting,
  paymentValues,
  mode,
  onModeChange,
  resellers,
  selectedResellerId,
  onSelectReseller,
  resellerQuery,
  onResellerQueryChange,
  onCustomerNameChange,
  onPaymentMethodChange,
  onAmountReceivedChange,
  onNoteChange,
  isLoading = false,
}: CartPanelProps) {
  const totalItems = cart.lines.reduce((sum, line) => sum + line.qty, 0);
  const filteredResellers =
    mode === "reseller" && resellerQuery.trim().length > 0
      ? resellers.filter((reseller) =>
          reseller.name
            .toLowerCase()
            .includes(resellerQuery.trim().toLowerCase())
        )
      : [];
  const shouldShowSuggestions =
    selectedResellerId == null && filteredResellers.length > 0;
  const changeDue =
    paymentValues.paymentMethod === "cash"
      ? Math.max(paymentValues.amountReceived - grandTotal, 0)
      : 0;

  if (isLoading) {
    return (
      <section className="space-y-4 rounded-2xl border bg-card/80 p-6 shadow-sm">
        <Skeleton className="h-6 w-1/2" />
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-2xl border border-muted-foreground/20 bg-muted/30 p-4"
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        ))}
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </section>
    );
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card/80 p-5 shadow-sm",
        className,
        "lg:sticky lg:top-4 h-full lg:h-[calc(100vh-6rem)]"
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-lg font-semibold">
          Keranjang
        </div>
        <Badge variant="outline" className="px-3 py-1 text-xs">
          {totalItems} item
        </Badge>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="rounded-2xl space-y-4">
          <div className="grid gap-3 md:grid-cols-[160px_1fr]">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Mode Transaksi
              </Label>
              <Select
                value={mode}
                onValueChange={(value) => onModeChange(value as typeof mode)}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="reseller">Reseller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "customer" ? (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Nama Customer (opsional)
                </Label>
                <Input
                  value={paymentValues.customerName}
                  onChange={(event) => onCustomerNameChange(event.target.value)}
                  placeholder="Nama pelanggan/reseller"
                  className="h-10 rounded-xl"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Cari Reseller</Label>
                <div className="relative">
                  <Input
                    value={resellerQuery}
                    onChange={(event) =>
                      onResellerQueryChange(event.target.value)
                    }
                    placeholder="Ketik nama reseller"
                    className="h-10 rounded-xl pr-10"
                  />
                  {selectedResellerId ? (
                    <IconCheck className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                  ) : null}
                  {shouldShowSuggestions ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-40 overflow-y-auto rounded-2xl border border-border/30 bg-background/95 shadow-xl">
                      <ul className="text-sm">
                        {filteredResellers.slice(0, 6).map((reseller) => (
                          <li key={reseller.id}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-muted"
                              onClick={() => onSelectReseller(reseller.id)}
                            >
                              <span>{reseller.name}</span>
                              {selectedResellerId === reseller.id ? (
                                <IconCheck className="h-4 w-4 text-emerald-500" />
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                {mode === "reseller" && !selectedResellerId ? (
                  <p className="text-xs text-destructive">
                    Pilih reseller untuk melanjutkan transaksi.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-muted-foreground/20 bg-background/80 p-4">
          {cart.lines.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Belum ada item di keranjang.
            </div>
          ) : (
            <div className="flex-1 min-h-[180px] space-y-3 overflow-y-auto pr-2">
              {cart.lines.map((line) => (
                <div
                  key={line.lineId}
                  className="flex flex-col gap-3 rounded-2xl border border-muted-foreground/30 bg-background/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {line.menuName}
                      </p>
                      {line.variantLabel ? (
                        <p className="text-xs text-muted-foreground">
                          {line.variantLabel}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatCurrency(line.unitPrice)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => onRemove(line.lineId)}
                      aria-label="Hapus item"
                    >
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border bg-background/40 px-3 py-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Qty
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() =>
                          onChangeQuantity(line.lineId, line.qty - 1)
                        }
                      >
                        <IconMinus className="h-4 w-4" />
                      </Button>
                      <Input
                        className="h-8 w-16 rounded-full border-muted-foreground/20 text-center"
                        type="text"
                        inputMode="numeric"
                        value={String(line.qty)}
                        onChange={(event) => {
                          const sanitized = event.target.value.replace(
                            /[^0-9]/g,
                            ""
                          );
                          if (!sanitized) {
                            return;
                          }
                          onChangeQuantity(
                            line.lineId,
                            Math.max(1, parseInt(sanitized, 10))
                          );
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() =>
                          onChangeQuantity(line.lineId, line.qty + 1)
                        }
                      >
                        <IconPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div />
      </div>

      <div className="shrink-0 space-y-4 rounded-3xl">
        <div className="space-y-2 text-sm">
          <div className="flex gap-3">
            <div className="rounded-2xl w-32">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Pembayaran
              </p>
              <Select
                value={paymentValues.paymentMethod}
                onValueChange={(value) =>
                  onPaymentMethodChange(
                    value as PaymentFormValues["paymentMethod"]
                  )
                }
              >
                <SelectTrigger className="mt-3 h-9 w-full rounded-full py-4 text-xs font-medium">
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentValues.paymentMethod === "cash" ? (
              <div className="rounded-2xl w-full">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Uang Diterima
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Contoh: 100000"
                  value={
                    paymentValues.amountReceived === 0
                      ? ""
                      : String(paymentValues.amountReceived)
                  }
                  onChange={(event) => {
                    const sanitized = event.target.value
                      .replace(/[^0-9.,]/g, "")
                      .replace(",", ".");
                    const parsed = sanitized.length ? Number(sanitized) : 0;
                    onAmountReceivedChange(
                      Math.max(0, Number.isNaN(parsed) ? 0 : parsed)
                    );
                  }}
                  className="mt-2 h-10 rounded-xl"
                />
              </div>
            ) : (
              null
            )}
          </div>

          <div className="rounded-2xl py-3">
            <Input
              value={paymentValues.note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Catatan (Opsional)"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Diskon</span>
              <span>
                {discountAmount > 0
                  ? `-${formatCurrency(discountAmount)}`
                  : formatCurrency(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>PPN ({Math.round(defaultTaxRate * 100)}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-md font-semibold text-foreground">
              <span>Total Pembayaran</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            {paymentValues.paymentMethod === "cash" ? (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Uang kembalian</span>
                <span className="text-green-500">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            className="h-12 w-full rounded-md text-base font-semibold"
            disabled={!canSubmit || isSubmitting || cart.lines.length === 0}
            onClick={onOpenPayment}
          >
            {isSubmitting ? "Memproses..." : "Checkout"}
          </Button>
        </div>
      </div>
    </section>
  );
}
