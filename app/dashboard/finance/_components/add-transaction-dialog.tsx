"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useCashFlowCategories, useCreateCashFlowMutation } from "@/features/finance/hooks";
import { IconPlus } from "@tabler/icons-react";
import * as React from "react";
import { toast } from "sonner";

export function AddTransactionDialog() {
  const [open, setOpen] = React.useState(false);
  const categoriesQuery = useCashFlowCategories();
  const createMutation = useCreateCashFlowMutation();

  const [date, setDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = React.useState<string>("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");

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
      await createMutation.mutateAsync({
        date: new Date(date),
        amount: Number(amount),
        categoryId,
        description,
      });
      setOpen(false);
      // Reset form
      setAmount("");
      setDescription("");
      setCategoryId("");
      setDate(new Date().toISOString().split('T')[0]);
    } catch {
       // handled by mutation
    }
  };

  const categories = categoriesQuery.data ?? [];
  const manualCategories = categories.filter(c => !c.isSystem);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="mr-2 h-4 w-4" />
          Catat Transaksi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Catat Transaksi Manual</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col gap-2">
                <Label htmlFor="date">Tanggal</Label>
                <Input 
                    id="date"
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    required
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="category">Kategori</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="category">
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
                <Label htmlFor="amount">Nominal (Rp)</Label>
                <Input 
                    id="amount"
                    type="number" 
                    min="0"
                    placeholder="0"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    required 
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="description">Keterangan (Opsional)</Label>
                <Textarea 
                    id="description"
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
