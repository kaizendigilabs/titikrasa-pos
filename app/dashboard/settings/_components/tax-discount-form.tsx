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

function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/40 bg-background/70 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {title}
        </p>
        {description ? (
          <p className="text-xs text-muted-foreground/80">{description}</p>
        ) : null}
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
      toast.success("Pengaturan pajak & diskon tersimpan");
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
      <SettingSection title="Pajak" description="Tarif PPN default untuk semua transaksi.">
        <div className="grid gap-4 lg:grid-cols-2">
          <form.Field name="taxRatePercent">
            {(field) => (
              <div className="space-y-2">
                <Label>Tarif PPN (%)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  min={0}
                  max={30}
                  step="0.1"
                  placeholder="Contoh: 11"
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))
                  }
                  onBlur={field.handleBlur}
                />
                <p className="text-xs text-muted-foreground">
                  Nilai 11 berarti 11% (disimpan sebagai 0.11)
                </p>
              </div>
            )}
          </form.Field>

          <form.Field name="autoApplyTax">
            {(field) => (
              <div className="flex items-center justify-between gap-6 rounded-2xl border border-white/5 bg-foreground/5 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Terapkan otomatis</p>
                  <p className="text-xs text-muted-foreground">
                    PPN langsung masuk ke transaksi baru
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
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-900 dark:text-emerald-200">
          Tarif aktif:{" "}
          <span className="font-semibold">
            {parseNumber(formValues.taxRatePercent).toFixed(2)}%
          </span>{" "}
          {formValues.autoApplyTax ? "(otomatis)" : "(manual)"}
        </div>
      </SettingSection>

      <SettingSection title="Diskon Transaksi" description="Diskon default untuk POS & reseller.">
        <div className="grid gap-4 lg:grid-cols-2">
          <form.Field name="discountMode">
            {(field) => (
              <div className="space-y-2">
                <Label>Jenis Diskon</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as DiscountSettings["mode"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis diskon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada</SelectItem>
                    <SelectItem value="percentage">Persentase</SelectItem>
                    <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Field name="discountValue">
            {(field) => (
              <div className="space-y-2">
                <Label>
                  Nilai Diskon{" "}
                  {formValues.discountMode === "percentage" ? "(%)" : "(Rp)"}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  placeholder={
                    formValues.discountMode === "percentage"
                      ? "Contoh: 5"
                      : "Contoh: 5000"
                  }
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))
                  }
                  onBlur={field.handleBlur}
                  disabled={formValues.discountMode === "none"}
                />
                <p className="text-xs text-muted-foreground">
                  {formValues.discountMode === "percentage"
                    ? "Nilai 5 berarti diskon 5%."
                    : "Masukkan dalam Rupiah, contoh 5000."}
                </p>
              </div>
            )}
          </form.Field>
        </div>
        <div className="rounded-2xl border border-border/30 bg-foreground/5 px-4 py-3 text-xs text-muted-foreground">
          Diskon aktif:{" "}
          {formValues.discountMode === "none"
            ? "tidak diterapkan otomatis."
            : formValues.discountMode === "percentage"
              ? `${parseNumber(formValues.discountValue).toFixed(2)}%`
              : `Rp ${Intl.NumberFormat("id-ID").format(
                  Math.round(parseNumber(formValues.discountValue)),
                )}`}
        </div>
      </SettingSection>

      <Button
        type="submit"
        className="w-full rounded-2xl bg-primary px-6 py-3 text-base font-semibold tracking-wide sm:w-auto"
        disabled={
          mutation.isPending || form.state.isSubmitting || !form.state.isDirty
        }
      >
        {mutation.isPending || form.state.isSubmitting ? "Menyimpan..." : "Simpan"}
      </Button>
    </form>
  );
}
