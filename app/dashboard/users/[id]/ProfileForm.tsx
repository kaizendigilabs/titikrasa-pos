"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/features/users/client";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

type ProfileFormProps = {
  userId: string;
  initialProfile: {
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
  };
};

export function ProfileForm({ userId, initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const latestProfileRef = React.useRef(initialProfile);

  const form = useForm({
    defaultValues: {
      name: initialProfile.name ?? "",
      email: initialProfile.email ?? "",
      phone: initialProfile.phone ?? "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      const snapshot = latestProfileRef.current;
      const payload: Record<string, string | null> = {};

      const trimmedName = value.name.trim();
      if (trimmedName && trimmedName !== (snapshot.name ?? "")) {
        payload.name = trimmedName;
      }

      const trimmedEmail = value.email.trim();
      if (trimmedEmail && trimmedEmail !== (snapshot.email ?? "")) {
        payload.email = trimmedEmail;
      }

      const normalizedPhone = value.phone.trim();
      const initialPhone = snapshot.phone ?? "";
      if (normalizedPhone !== initialPhone) {
        payload.phone = normalizedPhone.length > 0 ? normalizedPhone : null;
      }

      const trimmedPassword = value.password.trim();
      if (trimmedPassword.length > 0) {
        payload.password = trimmedPassword;
      }

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        return;
      }

      try {
        await updateProfile(userId, payload);
        toast.success("Profile updated");
        form.setFieldValue("password", "");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update profile";
        toast.error(message);
      }
    },
  });

  React.useEffect(() => {
    latestProfileRef.current = initialProfile;
    form.reset();
    form.setFieldValue("name", initialProfile.name ?? "");
    form.setFieldValue("email", initialProfile.email ?? "");
    form.setFieldValue("phone", initialProfile.phone ?? "");
    form.setFieldValue("password", "");
  }, [form, initialProfile]);

  return (
    <div className="grid gap-6 justify-center lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle>Profile information</CardTitle>
          <CardDescription>
            Your name and contact details are shared with team members who have
            permission to manage users.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <CardContent className="space-y-5">
            <FieldGroup className="space-y-5 pb-4">
              <form.Field name="name">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
                    <Input
                      id="profile-name"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      required
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="email">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                    <Input
                      id="profile-email"
                      type="email"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      required
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="phone">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
                    <Input
                      id="profile-phone"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      placeholder="08xxxxxxxx"
                    />
                    <FieldDescription>
                      Optional. This helps teammates reach you quickly when
                      needed.
                    </FieldDescription>
                  </Field>
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="profile-password">
                      New password
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="profile-password"
                        type={showPassword ? "text" : "password"}
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        onBlur={field.handleBlur}
                        placeholder="Leave blank to keep current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 mr-1 text-muted-foreground hover:bg-transparent"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <IconEyeOff className="h-4 w-4" />
                        ) : (
                          <IconEye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FieldDescription>
                      Password updates apply immediately. You’ll stay logged in
                      after saving.
                    </FieldDescription>
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end py-4">
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle>Security tips</CardTitle>
          <CardDescription>
            Keep your account protected with unique credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            • Use at least 8 characters with a mix of letters, numbers, and
            symbols.
          </p>
          <p>• Avoid reusing passwords from other services.</p>
          <p>
            • Update your password regularly, especially if you suspect
            compromise.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
