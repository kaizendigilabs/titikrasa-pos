"use client";

import * as React from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSettingsMutation } from "@/features/settings/hooks";
import type { DiscountSettings, TaxSettings } from "@/features/settings/types";
import { cn } from "@/lib/utils";
import { IconLoader2, IconPercentage, IconReceiptTax, IconTag, IconX } from "@tabler/icons-react";

type TaxDiscountFormProps = {
  tax: TaxSettings;
  discount: DiscountSettings;
};

type FormValues = {
  taxRatePercent: string;
  autoApplyTax: boolean;
  discountMode: DiscountSettings["mode"];
  discountValue: string;
};

function toDefaults(tax: TaxSettings, discount: DiscountSettings): FormValues {
  const taxPercent = Math.round((tax.rate ?? 0) * 1000) / 10;
  const discountValue =
    discount.mode === "percentage"
      ? Math.round(discount.value * 10000) / 100
      : Math.round(discount.value);

  return {
    taxRatePercent: taxPercent === 0 ? "" : taxPercent.toString(),
    autoApplyTax: tax.autoApply,
    discountMode: discount.mode,
    discountValue: discountValue === 0 ? "" : discountValue.toString(),
  };
}

function parseNumber(value: string, fallback = 0) {
  const trimmed = value.replace(",", ".").trim();
  if (trimmed.length === 0) return fallback;
  const result = Number(trimmed);
  return Number.isFinite(result) ? result : fallback;
}

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

export function TaxDiscountForm({ tax, discount }: TaxDiscountFormProps) {
  const mutation = useUpdateSettingsMutation();

  const form = useForm({
    defaultValues: toDefaults(tax, discount),
    onSubmit: async ({ value }) => {
      const taxPayload: TaxSettings = {
        rate: Math.max(parseNumber(value.taxRatePercent), 0) / 100,
        autoApply: value.autoApplyTax,
        label: tax.label,
      };

      const discountPayload: DiscountSettings = {
        mode: value.discountMode,
        value:
          value.discountMode === "percentage"
            ? Math.max(parseNumber(value.discountValue), 0) / 100
            : Math.max(Math.round(parseNumber(value.discountValue)), 0),
      };

      await mutation.mutateAsync({ tax: taxPayload, discount: discountPayload });
      toast.success("Pengaturan berhasil disimpan");
    },
  });

  const formValues = useStore(form.store, (state) => state.values);

  React.useEffect(() => {
    form.reset(toDefaults(tax, discount));
  }, [tax, discount, form]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-6"
    >
      <FormSection title="Pajak (PPN)">
        <div className="flex flex-col gap-6">
           <div className="flex flex-col-reverse gap-6 md:flex-row md:items-start">
            <div className="flex-1 space-y-4">
              <form.Field name="taxRatePercent">
                {(field) => (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Rate (%)</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-11 pl-10 border-border/60 bg-muted/20 font-medium transition-colors hover:border-primary/30 focus:border-primary/50 focus:bg-background"
                        placeholder="0"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))
                        }
                        onBlur={field.handleBlur}
                      />
                       <IconReceiptTax className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                       Masukkan angka saja (contoh: 11 untuk 11%)
                    </p>
                  </div>
                )}
              </form.Field>

              <form.Field name="autoApplyTax">
                {(field) => (
                  <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-4 transition-colors hover:bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Otomatis Terapkan</Label>
                      <p className="text-xs text-muted-foreground">
                        Tambahkan pajak ke setiap order baru.
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Status Card */}
            <div className="shrink-0 md:w-64">
               <div className="h-full rounded-xl bg-orange-50/50 p-4 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                  <p className="text-xs font-medium uppercase tracking-wider text-orange-600/80 dark:text-orange-400">
                    Status Pajak
                  </p>
                  <div className="mt-2 flex items-baseline gap-1">
                     <span className="text-3xl font-bold text-foreground">
                       {parseNumber(formValues.taxRatePercent).toFixed(1)}
                     </span>
                     <span className="text-sm font-medium text-muted-foreground">%</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className={cn(
                      "flex h-2 w-2 rounded-full",
                      formValues.autoApplyTax ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-muted-foreground/30"
                    )} />
                    <span className="text-xs font-medium text-muted-foreground">
                      {formValues.autoApplyTax ? "Terpasang Otomatis" : "Manual"}
                    </span>
                  </div>
               </div>
            </div>
           </div>
        </div>
      </FormSection>

      <FormSection title="Diskon Transaksi">
        <div className="grid gap-6 md:grid-cols-[1fr,1.5fr]">
          <form.Field name="discountMode">
            {(field) => (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Tipe Diskon</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as DiscountSettings["mode"])
                  }
                >
                  <SelectTrigger className="h-11 border-border/60 bg-muted/20 hover:border-primary/30">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                       <span className="flex items-center gap-2">
                         <IconX className="h-4 w-4 opacity-50"/> Tidak Aktif
                       </span>
                    </SelectItem>
                    <SelectItem value="percentage">
                        <span className="flex items-center gap-2">
                         <IconPercentage className="h-4 w-4 opacity-50"/> Persentase (%)
                       </span>
                    </SelectItem>
                    <SelectItem value="nominal">
                        <span className="flex items-center gap-2">
                         <span className="text-xs font-bold opacity-70">Rp</span> Nominal
                       </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Field name="discountValue">
            {(field) => (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">
                   Besaran Diskon {formValues.discountMode === "percentage" ? "(%)" : "(Rp)"}
                </Label>
                <div className="relative">
                  <Input
                    className="h-11 pl-10 border-border/60 bg-muted/20 font-medium hover:border-primary/30 focus:border-primary/50"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(event.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))
                    }
                    onBlur={field.handleBlur}
                    disabled={formValues.discountMode === "none"}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {formValues.discountMode === "nominal" ? (
                         <span className="text-xs font-bold">Rp</span>
                      ) : (
                         <IconTag className="h-5 w-5" />
                      )}
                  </div>
                </div>
                 <p className="text-[10px] text-muted-foreground">
                  {formValues.discountMode === "percentage"
                    ? "Contoh: 10 untuk diskon 10%"
                    : "Contoh: 5000 untuk diskon Rp 5.000"}
                </p>
              </div>
            )}
          </form.Field>
        </div>
      </FormSection>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          size="lg"
           className="min-w-[120px] rounded-xl font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
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
            "Simpan Perubahan"
          )}
        </Button>
      </div>
    </form>
  );
}


