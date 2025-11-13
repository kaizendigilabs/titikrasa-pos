"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CatalogCreateForm } from "../../CatalogCreateForm";

type CatalogItemSheetProps = {
  supplierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CatalogItemSheet({ supplierId, open, onOpenChange }: CatalogItemSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-xl">
        <SheetHeader>
          <SheetTitle>Tambah Item Katalog</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <CatalogCreateForm
            supplierId={supplierId}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
