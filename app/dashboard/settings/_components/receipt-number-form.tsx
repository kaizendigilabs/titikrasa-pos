"use client";

import * as React from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { toast } from "sonner";

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

type ReceiptNumberFormProps = {
  receiptNumbering: ReceiptNumberingSettings;
};

type FormValues = ReceiptNumberingSettings & { padding: string };

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
      <SettingSection title="Prefix">
        <div className="grid gap-4 lg:grid-cols-2">
          <form.Field name="posPrefix">
            {(field) => (
              <div className="space-y-2">
                <Label>Prefix POS</Label>
                <Input
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                  onBlur={field.handleBlur}
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">Contoh: POS, KAS, TKRS.</p>
              </div>
            )}
          </form.Field>

          <form.Field name="resellerPrefix">
            {(field) => (
              <div className="space-y-2">
                <Label>Prefix Reseller</Label>
                <Input
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                  onBlur={field.handleBlur}
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">Contoh: RES, PO, MITRA.</p>
              </div>
            )}
          </form.Field>
        </div>
      </SettingSection>

      <SettingSection title="Format & Reset">
        <div className="grid gap-4 lg:grid-cols-2">
          <form.Field name="padding">
            {(field) => (
              <div className="space-y-2">
                <Label>Digit Nomor</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  min={3}
                  max={6}
                  placeholder="Contoh: 4"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={field.handleBlur}
                />
                <p className="text-xs text-muted-foreground">Jumlah digit setelah prefix.</p>
              </div>
            )}
          </form.Field>

          <form.Field name="autoReset">
            {(field) => (
              <div className="space-y-2">
                <Label>Reset Nomor</Label>
                <Select value={field.state.value} onValueChange={(value) => field.handleChange(value as FormValues["autoReset"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Reset harian</SelectItem>
                    <SelectItem value="none">Tidak reset</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
        </div>
      </SettingSection>

      <div className="rounded-2xl border border-border/40 bg-foreground/5 px-4 py-4 text-sm">
        <p className="font-semibold text-foreground">Preview</p>
        <p className="text-muted-foreground">
          POS: <span className="font-mono text-foreground">{posPreview}</span>
        </p>
        <p className="text-muted-foreground">
          Reseller: <span className="font-mono text-foreground">{resellerPreview}</span>
        </p>
      </div>

      <Button
        type="submit"
        className="w-full rounded-2xl bg-primary px-6 py-3 text-base font-semibold tracking-wide sm:w-auto"
        disabled={
          mutation.isPending || form.state.isSubmitting || !form.state.isDirty
        }
      >
        {mutation.isPending || form.state.isSubmitting
          ? "Menyimpan..."
          : "Simpan"}
      </Button>
    </form>
  );
}
