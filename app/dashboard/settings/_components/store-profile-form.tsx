"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoreProfileSettings } from "@/features/settings/types";
import { useUpdateSettingsMutation } from "@/features/settings/hooks";

type StoreProfileFormProps = {
  storeProfile: StoreProfileSettings;
};

type FormValues = {
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
  footerNote: string;
};

const toDefaults = (profile: StoreProfileSettings): FormValues => ({
  name: profile.name,
  address: profile.address,
  phone: profile.phone,
  logoUrl: profile.logoUrl ?? "",
  footerNote: profile.footerNote ?? "",
});

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

export function StoreProfileForm({ storeProfile }: StoreProfileFormProps) {
  const mutation = useUpdateSettingsMutation();

  const form = useForm({
    defaultValues: toDefaults(storeProfile),
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        storeProfile: {
          name: value.name.trim(),
          address: value.address.trim(),
          phone: value.phone.trim(),
          logoUrl: value.logoUrl.trim().length > 0 ? value.logoUrl.trim() : null,
          footerNote: value.footerNote.trim().length > 0 ? value.footerNote.trim() : null,
        },
      });
      toast.success("Profil gerai diperbarui");
    },
  });

  React.useEffect(() => {
    form.reset(toDefaults(storeProfile));
  }, [storeProfile, form]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-6"
    >
      <SettingSection title="Identitas Gerai">
        <div className="grid gap-4 lg:grid-cols-2">
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label>Nama Toko</Label>
                <Input
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  required
                />
              </div>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <div className="space-y-2">
                <Label>Nomor Telepon</Label>
                <Input
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="+62-8xx"
                  required
                />
              </div>
            )}
          </form.Field>
        </div>

        <form.Field name="address">
          {(field) => (
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Textarea
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                rows={4}
                required
              />
            </div>
          )}
        </form.Field>
      </SettingSection>

      <SettingSection title="Branding Struk">
        <div className="grid gap-4 lg:grid-cols-2">
          <form.Field name="logoUrl">
            {(field) => (
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
                <p className="text-xs text-muted-foreground">
                  Opsional. Kosongkan jika tidak ada logo.
                </p>
              </div>
            )}
          </form.Field>

          <form.Field name="footerNote">
            {(field) => (
              <div className="space-y-2">
                <Label>Catatan Struk</Label>
                <Textarea
                  rows={4}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Terima kasih sudah berkunjung!"
                />
              </div>
            )}
          </form.Field>
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
