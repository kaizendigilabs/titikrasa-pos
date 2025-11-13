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
import type { SupplierListItem } from "@/features/procurements/suppliers/types";

type ToggleDialogState = {
  supplier: SupplierListItem;
  nextStatus: boolean;
} | null;

type ToggleStatusDialogProps = {
  dialog: ToggleDialogState;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ToggleStatusDialog({ dialog, onConfirm, onCancel }: ToggleStatusDialogProps) {
  const supplier = dialog?.supplier;
  const label = dialog?.nextStatus ? "activate" : "deactivate";
  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dialog?.nextStatus ? "Activate supplier?" : "Deactivate supplier?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {supplier
              ? `Are you sure you want to ${label} ${supplier.name ?? "this supplier"}?`
              : "Confirm action."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type DeleteDialogProps = {
  dialog: SupplierListItem | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteSupplierDialog({ dialog, onConfirm, onCancel }: DeleteDialogProps) {
  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog
              ? `This will permanently delete ${dialog.name ?? "this supplier"}.`
              : "Confirm deletion."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type BulkDeleteDialogProps = {
  dialog: SupplierListItem[] | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
};

export function BulkDeleteDialog({ dialog, onConfirm, onCancel, isPending }: BulkDeleteDialogProps) {
  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete selected suppliers?</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog
              ? `This will permanently delete ${dialog.length} supplier(s). This action cannot be undone.`
              : "Confirm deletion."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={isPending}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
