'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { MenuListItem } from '@/features/menus/types';

export type ToggleDialogState =
  | { menu: MenuListItem; nextStatus: boolean }
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
  const target = dialog?.menu;
  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dialog?.nextStatus ? 'Aktifkan menu?' : 'Nonaktifkan menu?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {target
              ? `Menu "${target.name}" akan ${
                  dialog?.nextStatus ? 'tersedia' : 'disembunyikan'
                } di POS.`
              : 'Konfirmasi perubahan status.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Lanjutkan</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type DeleteMenuDialogProps = {
  dialog: MenuListItem | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteMenuDialog({
  dialog,
  onConfirm,
  onCancel,
}: DeleteMenuDialogProps) {
  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus menu?</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog
              ? `Menu "${dialog.name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
              : 'Konfirmasi penghapusan.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
