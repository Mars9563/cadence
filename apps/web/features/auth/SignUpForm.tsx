'use client';

import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { FaGithub, FaGoogle } from 'react-icons/fa';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineUser,
} from 'react-icons/hi';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';

import { createClient } from '@/lib/supabase/client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const signUpSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.email('Please enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type SignUpInput = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const supabase = createClient();
  const router = useRouter();

  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(
    null,
  );

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: SignUpInput) {
    setAuthError(null);
    setIsLoading(true);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      setAuthError(error.message);

      toast.error('Sign up failed', {
        description: error.message,
      });

      setIsLoading(false);
      return;
    }

    // If email confirmation is enabled, Supabase returns
    // a user but no active session.
    if (!signUpData.session) {
      toast.success('Account created', {
        description: 'Check your email to confirm your account.',
      });

      setIsLoading(false);
      return;
    }

    toast.success('Account created', {
      description: 'Welcome to Cadence.',
    });

    router.push('/');
    router.refresh();
  }

  async function signUpWithOAuth(provider: 'google' | 'github') {
    setAuthError(null);
    setOauthLoading(provider);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      setAuthError(error.message);

      toast.error(`Unable to continue with ${provider}`, {
        description: error.message,
      });

      setOauthLoading(null);
    }
  }

  const isBusy = isLoading || oauthLoading !== null;

  return (
    <form
      id="sign-up-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full space-y-6"
    >
      <FieldGroup className="gap-5">
        {/* Name */}
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-up-name">Name</FieldLabel>

              <div className="relative">
                <HiOutlineUser className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />

                <Input
                  {...field}
                  id="sign-up-name"
                  type="text"
                  placeholder="Your name"
                  autoComplete="name"
                  aria-invalid={fieldState.invalid}
                  disabled={isBusy}
                  className="h-11 pl-9"
                />
              </div>

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Email */}
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>

              <div className="relative">
                <HiOutlineMail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />

                <Input
                  {...field}
                  id="sign-up-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                  disabled={isBusy}
                  className="h-11 pl-9"
                />
              </div>

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Password */}
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>

              <div className="relative">
                <HiOutlineLockClosed className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />

                <Input
                  {...field}
                  id="sign-up-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isBusy}
                  className="h-11 pl-9"
                />
              </div>

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Confirm password */}
        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-up-confirm-password">
                Confirm password
              </FieldLabel>

              <div className="relative">
                <HiOutlineLockClosed className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />

                <Input
                  {...field}
                  id="sign-up-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isBusy}
                  className="h-11 pl-9"
                />
              </div>

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      {/* Auth error */}
      {authError && (
        <p role="alert" className="text-destructive text-sm">
          {authError}
        </p>
      )}

      {/* Sign up */}
      <Button type="submit" className="h-11 w-full" disabled={isBusy}>
        {isLoading ? 'Creating account...' : 'Create account'}
      </Button>

      {/* Divider */}
      <div className="relative flex items-center">
        <Separator />

        <span className="bg-background text-muted-foreground absolute left-1/2 -translate-x-1/2 px-3 text-[10px] font-medium tracking-widest">
          OR CONTINUE WITH
        </span>
      </div>

      {/* OAuth */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={isBusy}
          onClick={() => signUpWithOAuth('google')}
        >
          <FaGoogle />
          {oauthLoading === 'google' ? 'Connecting...' : 'Google'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={isBusy}
          onClick={() => signUpWithOAuth('github')}
        >
          <FaGithub />
          {oauthLoading === 'github' ? 'Connecting...' : 'GitHub'}
        </Button>
      </div>

      {/* Sign in */}
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link
          href="/auth/sign-in"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
