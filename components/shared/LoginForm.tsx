'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

type ApiResponse<T> = {
  data: T | null;
  error: { message: string; code?: number } | null;
  meta: Record<string, unknown> | null;
};

type LoginResponse = {
  userId: string;
};

type LoginFormProps = React.ComponentProps<'div'> & {
  returnTo?: string | null;
};

export function LoginForm({ className, returnTo, ...props }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Email and password are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as ApiResponse<LoginResponse>;

      if (!response.ok || payload.error) {
        const message =
          payload.error?.message ?? 'Failed to sign in. Please try again.';
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success('Welcome back!');
      router.replace(returnTo ?? '/dashboard');
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unexpected error occurred during login.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <Button
                  type="button"
                  className="absolute bg-transparent hover:bg-transparent inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </Button>
                </div>
              </Field>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Login'}
                </Button>
                <FieldDescription className="text-center">
                  Contact your administrator if you need access
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
