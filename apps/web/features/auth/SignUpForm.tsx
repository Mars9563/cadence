'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, Mail, MailCheck, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { WORKSPACE_PATH } from '@/lib/routes';
import { createClient } from '@/lib/supabase/client';

import {
  AuthDivider,
  AuthHeader,
  AuthTextField,
  FormAlert,
  OAuthButtons,
  type OAuthProvider,
} from './AuthFormParts';

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter at least 2 characters.'),
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Enter your password again.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'The passwords don’t match.',
    path: ['confirmPassword'],
  });

type SignUpInput = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const supabase = createClient();
  const router = useRouter();

  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);

  /** Set when Supabase needs the address confirmed before signing in. */
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(
    null,
  );

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(data: SignUpInput) {
    setAuthError(null);
    setIsLoading(true);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      setAuthError(error.message);
      setIsLoading(false);
      return;
    }

    // With email confirmation on, Supabase returns a user but no session.
    if (!signUpData.session) {
      setConfirmationSentTo(data.email);
      setIsLoading(false);
      return;
    }

    router.push(WORKSPACE_PATH);
    router.refresh();
  }

  async function signUpWithOAuth(provider: OAuthProvider) {
    setAuthError(null);
    setOauthPending(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      setAuthError(error.message);
      setOauthPending(null);
    }
  }

  if (confirmationSentTo) {
    return (
      <div role="status" className="grid gap-6">
        <div className="bg-surface-raised text-primary flex size-10 items-center justify-center rounded-md">
          <MailCheck aria-hidden="true" className="size-5" />
        </div>

        <AuthHeader
          title="Check your email"
          subtitle={`We sent a confirmation link to ${confirmationSentTo}. Open it to finish creating your account.`}
        />

        <p className="text-muted-foreground -mt-4 text-(length:--cd-text-ui) leading-relaxed">
          Nothing there? Check spam, or{' '}
          <button
            type="button"
            onClick={() => setConfirmationSentTo(null)}
            className="text-foreground decoration-primary/60 hover:decoration-primary font-medium underline underline-offset-4"
          >
            use a different address
          </button>
          .
        </p>

        <Link
          href="/auth/sign-in"
          className="text-foreground decoration-primary/60 hover:decoration-primary w-fit text-(length:--cd-text-ui) font-medium underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  const isBusy = isLoading || oauthPending !== null;

  return (
    <>
      <AuthHeader
        title="Create your account"
        subtitle="Habits, tasks and notes, kept in one rhythm."
      />

      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-5"
      >
        {authError ? <FormAlert>{authError}</FormAlert> : null}

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <AuthTextField
              {...field}
              id="sign-up-name"
              label="Name"
              icon={User}
              placeholder="Your name"
              autoComplete="name"
              disabled={isBusy}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <AuthTextField
              {...field}
              id="sign-up-email"
              label="Email"
              icon={Mail}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isBusy}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <AuthTextField
              {...field}
              id="sign-up-password"
              label="Password"
              icon={Lock}
              type="password"
              revealable
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={isBusy}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <AuthTextField
              {...field}
              id="sign-up-confirm-password"
              label="Confirm password"
              icon={Lock}
              type="password"
              revealable
              autoComplete="new-password"
              disabled={isBusy}
              error={fieldState.error?.message}
            />
          )}
        />

        <Button
          type="submit"
          className="mt-1 h-10 text-(length:--cd-text-control)"
          disabled={isBusy}
        >
          {isLoading ? 'Creating account…' : 'Create account'}
        </Button>

        <AuthDivider />

        <OAuthButtons busy={isBusy} pending={oauthPending} onSelect={signUpWithOAuth} />
      </form>

      <p className="text-muted-foreground mt-8 text-(length:--cd-text-ui)">
        Already have an account?{' '}
        <Link
          href="/auth/sign-in"
          className="text-foreground decoration-primary/60 hover:decoration-primary font-medium underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
