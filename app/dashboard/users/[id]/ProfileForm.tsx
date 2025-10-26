'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { updateProfile } from '@/features/users/client';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

type ProfileFormProps = {
  userId: string;
  initialProfile: {
    name: string;
    email: string;
    phone: string | null;
  };
};

export function ProfileForm({ userId, initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const [formState, setFormState] = React.useState(() => ({
    name: initialProfile.name ?? '',
    email: initialProfile.email ?? '',
    phone: initialProfile.phone ?? '',
    password: '',
  }));
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    setFormState({
      name: initialProfile.name ?? '',
      email: initialProfile.email ?? '',
      phone: initialProfile.phone ?? '',
      password: '',
    });
  }, [initialProfile.email, initialProfile.name, initialProfile.phone]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const payload: Record<string, string> = {};
      const trimmedName = formState.name.trim();
      if (trimmedName && trimmedName !== (initialProfile.name ?? '')) {
        payload.name = trimmedName;
      }

      const trimmedEmail = formState.email.trim();
      if (trimmedEmail && trimmedEmail !== (initialProfile.email ?? '')) {
        payload.email = trimmedEmail;
      }

      const normalizedPhone = formState.phone.trim();
      const initialPhone = initialProfile.phone ?? '';
      if (normalizedPhone !== initialPhone) {
        payload.phone = normalizedPhone;
      }

      const trimmedPassword = formState.password.trim();
      if (trimmedPassword.length > 0) {
        payload.password = trimmedPassword;
      }

      if (Object.keys(payload).length === 0) {
        toast.info('No changes to save');
        return;
      }

      setIsSubmitting(true);
      try {
        await updateProfile(userId, payload);
        toast.success('Profile updated');
        setFormState((prev) => ({ ...prev, password: '' }));
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to update profile';
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState, initialProfile.email, initialProfile.name, initialProfile.phone, router, userId],
  );

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
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <FieldGroup className="space-y-5 pb-4">
              <Field>
                <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
                <Input
                  id="profile-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                <Input
                  id="profile-email"
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
                <Input
                  id="profile-phone"
                  value={formState.phone}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="08xxxxxxxx"
                />
                <FieldDescription>
                  Optional. This helps teammates reach you quickly when needed.
                </FieldDescription>
              </Field>
            <Field>
              <FieldLabel htmlFor="profile-password">New password</FieldLabel>
              <div className="relative">
                <Input
                  id="profile-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Leave blank to keep current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 mr-1 text-muted-foreground hover:bg-transparent"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                </Button>
              </div>
              <FieldDescription>
                Password updates apply immediately. You’ll stay logged in after
                saving.
              </FieldDescription>
            </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end py-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
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
          <p>• Use at least 8 characters with a mix of letters, numbers, and symbols.</p>
          <p>• Avoid reusing passwords from other services.</p>
          <p>• Update your password regularly, especially if you suspect compromise.</p>
        </CardContent>
      </Card>
    </div>
  );
}
