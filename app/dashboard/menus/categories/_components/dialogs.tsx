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
import type { MenuCategory } from '@/features/menu-categories/types';

export type ToggleCategoryDialog =
  | { category: MenuCategory; nextStatus: boolean }
  | null;

type ToggleCategoryDialogProps = {
  dialog: ToggleCategoryDialog;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ToggleStatusDialog({
  dialog,
  onConfirm,
  onCancel,
}: ToggleCategoryDialogProps) {
  const target = dialog?.category;
  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dialog?.nextStatus ? 'Aktifkan kategori?' : 'Nonaktifkan kategori?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {target
              ? `Kategori "${target.name}" akan ${
                  dialog?.nextStatus ? 'ditampilkan' : 'disembunyikan'
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

type DeleteCategoryDialogProps = {
  dialog: MenuCategory | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteCategoryDialog({
  dialog,
  onConfirm,
  onCancel,
}: DeleteCategoryDialogProps) {
  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus kategori?</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog
              ? `Kategori "${dialog.name}" akan dihapus permanen.`
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
