"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import type { CashFlow } from "@/features/finance/types";
import * as React from "react";
import { EditTransactionDialog } from "./edit-transaction-dialog";
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
import { useDeleteCashFlowMutation } from "@/features/finance/hooks";

interface FinanceTableRowActionsProps {
  row: CashFlow;
}

export function FinanceTableRowActions({ row }: FinanceTableRowActionsProps) {
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const deleteMutation = useDeleteCashFlowMutation();

  const isSystem = row.orderId || row.purchaseOrderId;

  if (isSystem) {
    return (
        <Button variant="ghost" size="icon" disabled className="opacity-0">
             <IconDots className="h-4 w-4" />
        </Button>
    )
  }

  const handleDelete = async () => {
    try {
        await deleteMutation.mutateAsync(row.id);
        setShowDeleteDialog(false);
    } catch {
        // handled
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <IconDots className="h-4 w-4" />
            <span className="sr-only">Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <IconEdit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <IconTrash className="mr-2 h-4 w-4" /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTransactionDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        transaction={row}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Transaksi ini akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
                onClick={(e) => {
                    e.preventDefault(); 
                    handleDelete();
                }}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
            >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
