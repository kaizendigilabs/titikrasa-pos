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
import { useCashFlowCategories } from "@/features/finance/hooks";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import * as React from "react";
import { toast } from "sonner";
// We need mutations for categories. 
// Assuming they don't exist yet based on `features/finance/hooks.ts` view earlier (only listCategories).
// I need to implement useCreateCategoryMutation and useDeleteCategoryMutation in hooks.ts first or inline simple fetch if hooks.ts is locked?
// Wait, I should add them to hooks.ts.
// Let's assume I will add them in next step or now. 
// For now, I'll write the component assuming the hooks exist, then update hooks.ts.

import { useCreateCategoryMutation, useDeleteCategoryMutation } from "@/features/finance/hooks";

export function ManageCategoriesDialog() {
  const [open, setOpen] = React.useState(false);
  const categoriesQuery = useCashFlowCategories();
  const createMutation = useCreateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"in" | "out">("out");

  const categories = categoriesQuery.data ?? [];
  // Sort: System first, then alphabetical? Or just listed.
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
        await createMutation.mutateAsync({ name, type });
        setName("");
        toast.success("Kategori berhasil dibuat");
    } catch {
        // handled
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await deleteMutation.mutateAsync(id);
        toast.success("Kategori berhasil dihapus");
    } catch {
       // handled
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Kelola Kategori
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Kelola Kategori</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
            {/* Create New */}
            <form onSubmit={handleCreate} className="flex items-end gap-2 p-4 border rounded-md bg-muted/30">
                <div className="space-y-2 flex-1">
                    <Label htmlFor="cat-name">Nama Kategori Baru</Label>
                    <Input 
                        id="cat-name"
                        placeholder="Contoh: Renovasi, Iklan"
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2 w-[120px]">
                     <Label htmlFor="cat-type">Tipe</Label>
                     <Select value={type} onValueChange={(v) => setType(v as "in" | "out")}>
                        <SelectTrigger id="cat-type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="in">Masuk</SelectItem>
                            <SelectItem value="out">Keluar</SelectItem>
                        </SelectContent>
                     </Select>
                </div>
                <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <IconPlus className="animate-spin h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
                </Button>
            </form>

            {/* List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                <Label>Daftar Kategori</Label>
                {categories.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kategori.</p>}
                
                {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
                        <div className="flex items-center gap-2">
                            <span className={`font-medium ${cat.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                {cat.type === 'in' ? '[Masuk]' : '[Keluar]'}
                            </span>
                            <span>{cat.name}</span>
                            {cat.isSystem && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">System</span>}
                        </div>
                        {!cat.isSystem && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(cat.id)}
                                disabled={deleteMutation.isPending}
                            >
                                <IconTrash className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
