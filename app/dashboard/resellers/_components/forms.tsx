"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import type { ResellerListItem } from "@/features/resellers/types";

export type InviteResellerFormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  note: string;
};

export type EditResellerFormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  note: string;
  isActive: boolean;
};

type InviteResellerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InviteResellerFormValues) => Promise<void>;
  isSubmitting: boolean;
};

type EditResellerSheetProps = {
  reseller: ResellerListItem | null;
  onOpenChange: (reseller: ResellerListItem | null) => void;
  onSubmit: (values: EditResellerFormValues) => Promise<void>;
  isSubmitting: boolean;
};

const INVITE_DEFAULTS: InviteResellerFormValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  note: "",
};

function buildEditDefaults(
  reseller: ResellerListItem | null,
): EditResellerFormValues {
  return {
    name: reseller?.name ?? "",
    email: reseller?.contact.email ?? "",
    phone: reseller?.contact.phone ?? "",
    address: reseller?.contact.address ?? "",
    note: reseller?.contact.note ?? "",
    isActive: reseller?.is_active ?? true,
  };
}

export function InviteResellerSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: InviteResellerSheetProps) {
  const inviteForm = useForm({
    defaultValues: INVITE_DEFAULTS,
    onSubmit: async ({ value }) => {
      await onSubmit(value as InviteResellerFormValues);
      inviteForm.reset();
      onOpenChange(false);
    },
  });

  React.useEffect(() => {
    if (!open) {
      inviteForm.reset();
    }
  }, [inviteForm, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Invite Reseller</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void inviteForm.handleSubmit();
          }}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          <inviteForm.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="reseller-name">Company / Contact name</Label>
                <Input
                  id="reseller-name"
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Barista Supplies"
                />
              </div>
            )}
          </inviteForm.Field>
          <inviteForm.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="reseller-email">Email</Label>
                <Input
                  id="reseller-email"
                  type="email"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="contact@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Leave blank if the reseller prefers phone only.
                </p>
              </div>
            )}
          </inviteForm.Field>
          <inviteForm.Field name="phone">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="reseller-phone">Phone</Label>
                <Input
                  id="reseller-phone"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="08xxxxxxxx"
                />
              </div>
            )}
          </inviteForm.Field>
          <inviteForm.Field name="address">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="reseller-address">Address</Label>
                <Input
                  id="reseller-address"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Warehouse / Office"
                />
              </div>
            )}
          </inviteForm.Field>
          <inviteForm.Field name="note">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="reseller-note">Notes</Label>
                <Input
                  id="reseller-note"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Payment term, PIC, etc"
                />
              </div>
            )}
          </inviteForm.Field>
          <SheetFooter>
            <Button
              type="submit"
              disabled={isSubmitting || inviteForm.state.isSubmitting}
            >
              {isSubmitting || inviteForm.state.isSubmitting
                ? "Creating..."
                : "Create Reseller"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function EditResellerSheet({
  reseller,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditResellerSheetProps) {
  const editForm = useForm({
    defaultValues: buildEditDefaults(reseller),
    onSubmit: async ({ value }) => {
      await onSubmit(value as EditResellerFormValues);
      onOpenChange(null);
    },
  });

  React.useEffect(() => {
    editForm.reset();
    const defaults = buildEditDefaults(reseller);
    editForm.setFieldValue("name", defaults.name);
    editForm.setFieldValue("email", defaults.email);
    editForm.setFieldValue("phone", defaults.phone);
    editForm.setFieldValue("address", defaults.address);
    editForm.setFieldValue("note", defaults.note);
    editForm.setFieldValue("isActive", defaults.isActive);
  }, [editForm, reseller]);

  if (!reseller) {
    return null;
  }

  return (
    <Sheet open={Boolean(reseller)} onOpenChange={() => onOpenChange(null)}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit Reseller</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void editForm.handleSubmit();
          }}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          <editForm.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full name</Label>
                <Input
                  id="edit-name"
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </editForm.Field>
          <editForm.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </editForm.Field>
          <editForm.Field name="phone">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="08xxxxxxxx"
                />
              </div>
            )}
          </editForm.Field>
          <editForm.Field name="address">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </editForm.Field>
          <editForm.Field name="note">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="edit-note">Notes</Label>
                <Input
                  id="edit-note"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </editForm.Field>
          <editForm.Field name="isActive">
            {(field) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={field.state.value}
                  onCheckedChange={(checked) =>
                    field.handleChange(Boolean(checked))
                  }
                />
                Active
              </label>
            )}
          </editForm.Field>
          <SheetFooter>
            <Button
              type="submit"
              disabled={isSubmitting || editForm.state.isSubmitting}
            >
              {isSubmitting || editForm.state.isSubmitting
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
