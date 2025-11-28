"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CatalogCreateForm } from "../../CatalogCreateForm";

type CatalogItemDialogProps = {
  supplierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CatalogItemDialog({
  supplierId,
  open,
  onOpenChange,
}: CatalogItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah Item Katalog</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <CatalogCreateForm
            supplierId={supplierId}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
