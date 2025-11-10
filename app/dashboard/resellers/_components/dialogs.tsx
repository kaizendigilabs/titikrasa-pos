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
import type { ResellerListItem } from "@/features/resellers/types";

type ToggleDialogState = {
  reseller: ResellerListItem;
  nextStatus: boolean;
} | null;

type ToggleStatusDialogProps = {
  dialog: ToggleDialogState;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ToggleStatusDialog({
  dialog,
  onConfirm,
  onCancel,
}: ToggleStatusDialogProps) {
  const reseller = dialog?.reseller;
  const nextLabel = dialog?.nextStatus ? "activate" : "deactivate";
  return (
    <AlertDialog
      open={Boolean(dialog)}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dialog?.nextStatus ? "Activate reseller?" : "Deactivate reseller?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {reseller
              ? `Are you sure you want to ${nextLabel} ${reseller.name ?? "this reseller"}?`
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
  dialog: ResellerListItem | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteResellerDialog({
  dialog,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  return (
    <AlertDialog
      open={Boolean(dialog)}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete reseller?</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog
              ? `This will permanently delete ${dialog.name ?? "this reseller"}.`
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
  dialog: ResellerListItem[] | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
};

export function BulkDeleteDialog({
  dialog,
  onConfirm,
  onCancel,
  isPending,
}: BulkDeleteDialogProps) {
  return (
    <AlertDialog
      open={Boolean(dialog)}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete selected resellers?</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog
              ? `This will permanently delete ${dialog.length} reseller(s). This action cannot be undone.`
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
