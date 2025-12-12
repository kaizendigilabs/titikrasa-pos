"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCashFlowCategories, useUpdateCashFlowMutation } from "@/features/finance/hooks";
import type { CashFlow } from "@/features/finance/types";
import * as React from "react";
import { toast } from "sonner";

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: CashFlow;
}

export function EditTransactionDialog({ open, onOpenChange, transaction }: EditTransactionDialogProps) {
  const categoriesQuery = useCashFlowCategories();
  const updateMutation = useUpdateCashFlowMutation();

  const [date, setDate] = React.useState<string>(new Date(transaction.date).toISOString().split('T')[0]);
  const [amount, setAmount] = React.useState<string>(String(transaction.amount));
  const [categoryId, setCategoryId] = React.useState<string>(transaction.categoryId);
  const [description, setDescription] = React.useState<string>(transaction.description || "");

  // Reset form when transaction changes
  React.useEffect(() => {
    if (open) {
        setDate(new Date(transaction.date).toISOString().split('T')[0]);
        setAmount(String(transaction.amount));
        setCategoryId(transaction.categoryId);
        setDescription(transaction.description || "");
    }
  }, [open, transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
        toast.error("Pilih kategori");
        return;
    }
    if (!amount || Number(amount) <= 0) {
        toast.error("Masukkan nominal yang valid");
        return;
    }

    try {
      await updateMutation.mutateAsync({
        id: transaction.id,
        payload: {
          date: new Date(date),
          amount: Number(amount),
          categoryId,
          description,
        }
      });
      onOpenChange(false);
    } catch {
       // handled by mutation
    }
  };

  const categories = categoriesQuery.data ?? [];
  const manualCategories = categories.filter(c => !c.isSystem || c.id === transaction.categoryId); // Allow current category even if system (unlikely for manual edit but safe)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Transaksi</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col gap-2">
                <Label htmlFor="edit-date">Tanggal</Label>
                <Input 
                    id="edit-date"
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    required
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="edit-category">Kategori</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="edit-category">
                        <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                         {manualCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name} ({cat.type === 'in' ? 'Masuk' : 'Keluar'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="edit-amount">Nominal (Rp)</Label>
                <Input 
                    id="edit-amount"
                    type="number" 
                    min="0"
                    placeholder="0"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    required 
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="edit-description">Keterangan (Opsional)</Label>
                <Textarea 
                    id="edit-description"
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
