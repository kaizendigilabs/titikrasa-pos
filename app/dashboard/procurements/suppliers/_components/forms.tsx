"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { SupplierListItem } from "@/features/procurements/suppliers/types";

export type SupplierFormValues = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  note: string;
};

export type SupplierEditFormValues = SupplierFormValues & {
  isActive: boolean;
};

type InviteSupplierDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  isSubmitting: boolean;
};

type EditSupplierDialogProps = {
  supplier: SupplierListItem | null;
  onOpenChange: (supplier: SupplierListItem | null) => void;
  onSubmit: (values: SupplierEditFormValues) => Promise<void>;
  isSubmitting: boolean;
};

const DEFAULT_VALUES: SupplierFormValues = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  note: "",
};

const buildEditDefaults = (supplier: SupplierListItem | null): SupplierEditFormValues => ({
  name: supplier?.name ?? "",
  contactName: supplier?.contact.name ?? "",
  email: supplier?.contact.email ?? "",
  phone: supplier?.contact.phone ?? "",
  address: supplier?.contact.address ?? "",
  note: supplier?.contact.note ?? "",
  isActive: supplier?.is_active ?? true,
});

export function InviteSupplierDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: InviteSupplierDialogProps) {
  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      await onSubmit(value as SupplierFormValues);
      form.reset();
      onOpenChange(false);
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Supplier</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="supplier-name">Company / contact</Label>
                <Input
                  id="supplier-name"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="PT Rasa Sumber"
                  required
                />
              </div>
            )}
          </form.Field>
          <form.Field name="contactName">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="supplier-contact">PIC name</Label>
                <Input
                  id="supplier-contact"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Jane Doe"
                />
              </div>
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="contact@example.com"
                />
              </div>
            )}
          </form.Field>
          <form.Field name="phone">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="supplier-phone">Phone</Label>
                <Input
                  id="supplier-phone"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="08xxxxxxxx"
                />
              </div>
            )}
          </form.Field>
          <form.Field name="address">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="supplier-address">Address</Label>
                <Input
                  id="supplier-address"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Warehouse / office"
                />
              </div>
            )}
          </form.Field>
          <form.Field name="note">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="supplier-note">Notes</Label>
                <Input
                  id="supplier-note"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Payment term, bank account, etc"
                />
              </div>
            )}
          </form.Field>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || form.state.isSubmitting}>
              {isSubmitting || form.state.isSubmitting ? "Creating..." : "Create Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditSupplierDialog({
  supplier,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditSupplierDialogProps) {
  const form = useForm({
    defaultValues: buildEditDefaults(supplier),
    onSubmit: async ({ value }) => {
      await onSubmit(value as SupplierEditFormValues);
      onOpenChange(null);
    },
  });

  React.useEffect(() => {
    form.reset();
    const defaults = buildEditDefaults(supplier);
    form.setFieldValue("name", defaults.name);
    form.setFieldValue("contactName", defaults.contactName);
    form.setFieldValue("email", defaults.email);
    form.setFieldValue("phone", defaults.phone);
    form.setFieldValue("address", defaults.address);
    form.setFieldValue("note", defaults.note);
    form.setFieldValue("isActive", defaults.isActive);
  }, [form, supplier]);

  if (!supplier) {
    return null;
  }

  return (
    <Dialog
      open={Boolean(supplier)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onOpenChange(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          {(["name", "contactName", "email", "phone", "address", "note"] as const).map((fieldName) => (
            <form.Field key={fieldName} name={fieldName}>
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={`edit-${fieldName}`}>{fieldName === "contactName" ? "PIC name" : fieldName === "note" ? "Notes" : fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}</Label>
                  <Input
                    id={`edit-${fieldName}`}
                    type={fieldName === "email" ? "email" : "text"}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder={fieldName === "name" ? "Supplier name" : undefined}
                    required={fieldName === "name"}
                  />
                </div>
              )}
            </form.Field>
          ))}
          <form.Field name="isActive">
            {(field) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
                />
                Active
              </label>
            )}
          </form.Field>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || form.state.isSubmitting}>
              {isSubmitting || form.state.isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
