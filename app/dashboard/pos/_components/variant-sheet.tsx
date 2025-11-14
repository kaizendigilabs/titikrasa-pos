"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VariantDialogState } from "./use-pos-controller";
import type { VariantOption } from "@/features/pos/utils";
import { formatCurrency } from "@/lib/utils/formatters";

type VariantSheetProps = {
  state: VariantDialogState | null;
  onClose: () => void;
  onSelect: (option: VariantOption, menu: VariantDialogState["menu"]) => void;
};

export function VariantSheet({ state, onClose, onSelect }: VariantSheetProps) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        {state ? (
          <>
            <DialogHeader>
              <DialogTitle>Pilih Varian</DialogTitle>
              <DialogDescription>
                Tentukan kombinasi ukuran dan temperatur untuk {state.menu.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {state.options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => onSelect(option, state.menu)}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {option.label}
                    </p>
                  </div>
                  <span className="text-sm text-foreground">
                    {formatCurrency(option.price)}
                  </span>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Batal
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
