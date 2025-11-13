"use client";

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
import type { SupplierCatalogWithLinks } from "@/features/procurements/suppliers/types";

type CatalogItemDeleteDialogProps = {
  item: SupplierCatalogWithLinks | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function CatalogItemDeleteDialog({
  item,
  isPending,
  onConfirm,
  onClose,
}: CatalogItemDeleteDialogProps) {
  return (
    <AlertDialog open={Boolean(item)} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete catalog item</AlertDialogTitle>
          <AlertDialogDescription>
            {item
              ? `Item "${item.name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive/40"
            disabled={isPending}
            onClick={() => onConfirm()}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
