"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
type SupplierTransactionsActionsProps = {
  supplierId: string;
};

export function SupplierTransactionsActions({
  supplierId,
}: SupplierTransactionsActionsProps) {
  return (
    <Button asChild variant="outline" className="w-fit">
      <Link href={`/dashboard/procurements/suppliers/${supplierId}`}>
        Kembali ke detail
      </Link>
    </Button>
  );
}
