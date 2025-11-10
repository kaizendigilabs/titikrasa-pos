"use client";

import * as React from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserListItem } from "@/features/users/types";

import {
  DEFAULT_ROLE,
  MANAGED_ROLES,
  isManagedRole,
  type ManagedRole,
} from "../table-filters";

export type InviteFormState = {
  email: string;
  name: string;
  phone: string;
  role: ManagedRole;
  password: string;
};

type InviteUserSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: InviteFormState) => Promise<void>;
  isSubmitting: boolean;
  roles: Array<{ id: string; name: string }>;
};

export function InviteUserSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  roles,
}: InviteUserSheetProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const inviteForm = useForm({
    defaultValues: {
      email: "",
      name: "",
      phone: "",
      role: DEFAULT_ROLE,
      password: "",
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value as InviteFormState);
      inviteForm.reset();
      setShowPassword(false);
    },
  });

  React.useEffect(() => {
    if (!open) {
      inviteForm.reset();
      setShowPassword(false);
    }
  }, [inviteForm, open]);

  const roleOptions: ManagedRole[] =
    roles.length > 0
      ? roles.map((role) => role.name).filter(isManagedRole)
      : [...MANAGED_ROLES];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Invite User</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void inviteForm.handleSubmit();
          }}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          <inviteForm.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="user@example.com"
                />
              </div>
            )}
          </inviteForm.Field>
          <inviteForm.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="invite-name">Full name</Label>
                <Input
                  id="invite-name"
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Barista Manager"
                />
              </div>
            )}
          </inviteForm.Field>
          <inviteForm.Field name="phone">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="invite-phone">Phone</Label>
                <Input
                  id="invite-phone"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="08xxxxxxxx (Opsional)"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Leave blank if the user prefers not to share a phone
                  number.
                </p>
              </div>
            )}
          </inviteForm.Field>
          <inviteForm.Field name="role">
            {(field) => (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (isManagedRole(value)) {
                      field.handleChange(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((roleName) => (
                      <SelectItem key={roleName} value={roleName}>
                        {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </inviteForm.Field>
          <inviteForm.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="invite-password">Temporary password</Label>
                <div className="relative">
                  <Input
                    id="invite-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Minimum 8 characters"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 mr-1 text-muted-foreground hover:bg-transparent"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
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
                : "Create User"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export type EditFormState = {
  name: string;
  phone: string;
  role: ManagedRole;
  isActive: boolean;
};

type EditUserSheetProps = {
  user: UserListItem | null;
  onOpenChange: (user: UserListItem | null) => void;
  onSubmit: (payload: EditFormState) => Promise<void>;
  isSubmitting: boolean;
  roles: Array<{ id: string; name: string }>;
};

export function EditUserSheet({
  user,
  onOpenChange,
  onSubmit,
  isSubmitting,
  roles,
}: EditUserSheetProps) {
  const editForm = useForm({
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      role:
        (user?.role && isManagedRole(user.role) && user.role) || DEFAULT_ROLE,
      isActive: user?.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      const normalized: EditFormState = {
        name: value.name.trim(),
        phone: value.phone.trim(),
        role: value.role as ManagedRole,
        isActive: value.isActive,
      };
      await onSubmit(normalized);
    },
  });

  React.useEffect(() => {
    if (user) {
      editForm.setFieldValue("name", user.name ?? "");
      editForm.setFieldValue("phone", user.phone ?? "");
      editForm.setFieldValue(
        "role",
        isManagedRole(user.role) ? user.role : DEFAULT_ROLE,
      );
      editForm.setFieldValue("isActive", user.is_active);
      editForm.reset();
    }
  }, [editForm, user]);

  if (!user) {
    return null;
  }

  const roleOptions: ManagedRole[] =
    roles.length > 0
      ? roles.map((role) => role.name).filter(isManagedRole)
      : [...MANAGED_ROLES];

  return (
    <Sheet open={Boolean(user)} onOpenChange={() => onOpenChange(null)}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit User</SheetTitle>
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
          <editForm.Field name="phone">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="08xxxxxxxx (Opsional)"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Leave blank to remove the saved phone number.
                </p>
              </div>
            )}
          </editForm.Field>
          <editForm.Field name="role">
            {(field) => (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (isManagedRole(value)) {
                      field.handleChange(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((roleName) => (
                      <SelectItem key={roleName} value={roleName}>
                        {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
