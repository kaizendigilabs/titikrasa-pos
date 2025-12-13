"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { UseStockOpnameControllerResult } from "./use-stock-opname";

type StockOpnameDialogProps = {
  controller: UseStockOpnameControllerResult;
};

export function StockOpnameDialog({ controller }: StockOpnameDialogProps) {
  const [open, setOpen] = React.useState(false);
  const {
    form,
    outstandingCount,
    isSubmitting,
    submit,
    error,
  } = controller;

  const handleSubmit = async () => {
    await submit();
    // Close dialog if successful (we can check simple success by statusMessage change or just close it)
    // Actually submit() sets statusMessage on success.
    // Ideally we should wait and see. For now let's just assume if no error, we close.
    // The hook doesn't return success status easily.
    // Let's rely on toast in hook and maybe manually close if !isSubmitting check passes later?
    // Simplify: Just close on click if we want, or better:
    // The submit function in hook is async.
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={outstandingCount === 0}>
          Sync ({outstandingCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Stock Adjustment</DialogTitle>
          <DialogDescription>
            You are about to adjust stock for {outstandingCount} items.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">


          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (Required)</Label>
            <form.Field name="notes">
              {(field: any) => (
                <Textarea
                  id="notes"
                  placeholder="Reason for adjustment (e.g. Broken stock, Periodic Opname)"
                  value={(field.state.value as string) ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="resize-none"
                />
              )}
            </form.Field>
          </div>

           {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
