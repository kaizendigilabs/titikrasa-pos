"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SupplierTransactionsEmptyState({
  supplierId,
}: {
  supplierId: string;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <h3 className="text-lg font-semibold">Belum ada purchase order</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Buat PO pertama atau tinjau detail supplier untuk melihat ringkasan transaksi.
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/procurements/suppliers/${supplierId}`}>
            Kembali ke detail
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          Gunakan tombol “New PO” di header untuk memulai.
        </span>
      </div>
    </div>
  );
}

export function SupplierTransactionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`transactions-skeleton-${index.toString()}`}
          className="rounded-md border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
