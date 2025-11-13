"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PurchaseOrderCreateSheet } from "@/app/dashboard/procurements/purchase-orders/_components/forms";
import { usePurchaseOrderCreateSheetController } from "@/app/dashboard/procurements/purchase-orders/_components/use-purchase-orders-table";
import type {
  PurchaseOrderCatalogItem,
  PurchaseOrderSupplierOption,
} from "@/features/procurements/purchase-orders/types";

type SupplierTransactionsActionsProps = {
  supplierId: string;
  suppliers: PurchaseOrderSupplierOption[];
  catalogItems: PurchaseOrderCatalogItem[];
};

export function SupplierTransactionsActions({
  supplierId,
  suppliers,
  catalogItems,
}: SupplierTransactionsActionsProps) {
  const controller = usePurchaseOrderCreateSheetController({
    suppliers,
    catalogItems,
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href={`/dashboard/procurements/suppliers/${supplierId}`}>
            Kembali ke detail
          </Link>
        </Button>
        <Button onClick={() => controller.openSheet({ supplierId })}>
          New PO
        </Button>
      </div>
      <PurchaseOrderCreateSheet {...controller.sheetProps} />
    </div>
  );
}
