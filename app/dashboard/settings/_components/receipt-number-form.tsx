"use client";

import * as React from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { toast } from "sonner";
import { IconLoader2, IconHash, IconRefresh, IconReceipt2, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReceiptNumberingSettings } from "@/features/settings/types";
import { useUpdateSettingsMutation } from "@/features/settings/hooks";
import { cn } from "@/lib/utils";

type ReceiptNumberFormProps = {
  receiptNumbering: ReceiptNumberingSettings;
};

type FormValues = ReceiptNumberingSettings & { padding: string };

function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md hover:shadow-stone-200/50 dark:hover:shadow-none",
        className,
      )}
    >
      <div className="border-b border-border/40 pb-4 mb-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
          <span className="inline-block h-1 w-1 rounded-full bg-primary/40" />
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export function ReceiptNumberForm({ receiptNumbering }: ReceiptNumberFormProps) {
  const mutation = useUpdateSettingsMutation();

  const form = useForm({
    defaultValues: { ...receiptNumbering, padding: receiptNumbering.padding.toString() },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        receiptNumbering: {
          posPrefix: value.posPrefix.trim().toUpperCase(),
          resellerPrefix: value.resellerPrefix.trim().toUpperCase(),
          padding: Math.max(3, Math.min(6, Math.trunc(Number(value.padding) || 0))),
          autoReset: value.autoReset,
        },
      });
      toast.success("Format nomor struk diperbarui");
    },
  });

  React.useEffect(() => {
    form.reset({ ...receiptNumbering, padding: receiptNumbering.padding.toString() });
  }, [receiptNumbering, form]);

  const values = useStore(form.store, (state) => state.values);
  const paddingNumber = Math.max(3, Math.min(6, Number(values.padding) || receiptNumbering.padding));
  const posPreview = `${values.posPrefix || "POS"}-${String(12).padStart(paddingNumber, "0")}`;
  const resellerPreview = `${values.resellerPrefix || "RES"}-${String(120).padStart(
    paddingNumber,
    "0",
  )}`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <FormSection title="Konfigurasi Prefix">
            <div className="space-y-4">
              <form.Field name="posPrefix">
                {(field) => (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Prefix POS</Label>
                    <Input
                      className="h-11 border-border/60 bg-muted/20 font-mono tracking-wide hover:border-primary/30 focus:border-primary/50"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                      onBlur={field.handleBlur}
                      maxLength={6}
                      placeholder="POS"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="resellerPrefix">
                {(field) => (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Prefix Reseller</Label>
                    <Input
                       className="h-11 border-border/60 bg-muted/20 font-mono tracking-wide hover:border-primary/30 focus:border-primary/50"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                      onBlur={field.handleBlur}
                      maxLength={6}
                      placeholder="RES"
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </FormSection>

          <FormSection title="Format Urutan">
            <div className="space-y-4">
              <form.Field name="padding">
                {(field) => (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Jumlah Digit</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        min={3}
                        max={6}
                        className="h-11 pl-10 border-border/60 bg-muted/20 hover:border-primary/30 focus:border-primary/50"
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value.replace(/[^0-9]/g, ""))}
                        onBlur={field.handleBlur}
                      />
                      <IconHash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Min: 3, Max: 6 digit (001 - 000001)</p>
                  </div>
                )}
              </form.Field>

              <form.Field name="autoReset">
                {(field) => (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Reset Counter</Label>
                    <Select value={field.state.value} onValueChange={(value) => field.handleChange(value as FormValues["autoReset"])}>
                      <SelectTrigger className="h-11 border-border/60 bg-muted/20 hover:border-primary/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">
                          <span className="flex items-center gap-2">
                             <IconRefresh className="h-4 w-4 opacity-50"/> Harian (Setiap pagi)
                          </span>
                        </SelectItem>
                        <SelectItem value="none">
                          <span className="flex items-center gap-2">
                             <IconX className="h-4 w-4 opacity-50"/> Tidak pernah
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            </div>
          </FormSection>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
           <FormSection title="Preview Struk" className="h-full bg-stone-50/50 dark:bg-stone-900/20">
              <div className="flex h-full flex-col justify-between gap-6">
                 <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Simulasi tampilan nomor struk pada bukti pembayaran:
                    </p>
                    
                    <div className="rounded-xl border border-border/50 bg-white p-6 shadow-sm dark:bg-card">
                       <div className="mb-4 flex items-center justify-between border-b border-dashed border-border pb-4">
                          <div className="flex items-center gap-2 text-stone-500">
                             <IconReceipt2 className="h-5 w-5" />
                             <span className="text-xs font-medium uppercase tracking-widest">Receipt</span>
                          </div>
                          <div className="h-2 w-2 rounded-full bg-emerald-500/50" />
                       </div>
                       
                       <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Transaksi POS</span>
                            <span className="font-mono text-base font-bold text-foreground tracking-tight">
                              {posPreview}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Order Reseller</span>
                            <span className="font-mono text-base font-bold text-foreground tracking-tight">
                              {resellerPreview}
                            </span>
                          </div>
                       </div>
                        
                       <div className="mt-4 flex justify-center">
                          <div className="h-8 w-48 bg-stone-100 dark:bg-stone-800 rounded px-2 py-1">
                             {/* Fake Barcode */}
                              <div className="h-full w-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQQI12PgAAAAASgD8DEW9AAAAAElFTkSuQmCC')] opacity-20" />
                          </div>
                       </div>
                    </div>
                 </div>

                 <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-xl font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
                    disabled={
                      mutation.isPending || form.state.isSubmitting || !form.state.isDirty
                    }
                  >
                    {mutation.isPending || form.state.isSubmitting ? (
                      <>
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Pengaturan"
                    )}
                  </Button>
              </div>
           </FormSection>
        </div>
      </div>
    </form>
  );
}


