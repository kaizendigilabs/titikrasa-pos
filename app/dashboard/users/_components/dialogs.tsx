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
import type { UserListItem } from "@/features/users/types";

export type ToggleDialogState =
  | { user: UserListItem; nextStatus: boolean }
  | null;

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
  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dialog?.nextStatus ? "Activate user?" : "Deactivate user?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dialog?.user
              ? `Are you sure you want to ${
                  dialog.nextStatus ? "activate" : "deactivate"
                } ${dialog.user.name ?? dialog.user.email ?? "this user"}?`
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

type DeleteUserDialogProps = {
  dialog: UserListItem | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteUserDialog({
  dialog,
  onConfirm,
  onCancel,
}: DeleteUserDialogProps) {
  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog
              ? `This will permanently delete ${
                  dialog.name ?? dialog.email ?? "this user"
                }. This action cannot be undone.`
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
  dialog: UserListItem[] | null;
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
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete selected users?</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog
              ? `This will permanently delete ${dialog.length} user(s). This action cannot be undone.`
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
