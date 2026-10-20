'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, Mail } from 'lucide-react';

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

const signInSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type SignInInput = z.infer<typeof signInSchema>;

/*
 * Errors the OAuth callback route (app/auth/callback) sends back as
 * ?error=..., which this page used to ignore.
 */
const CALLBACK_ERRORS: Record<string, string> = {
  missing_code: 'That sign-in link is incomplete. Try signing in again.',
  oauth_callback:
    'Signing in with that provider didn’t finish. Try again, or use your email and password.',
  link_invalid:
    'That link has expired or was already used. Request a new one below.',
};

export function SignInForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackError = CALLBACK_ERRORS[searchParams.get('error') ?? ''];
  const accountDeleted = searchParams.get('deleted') === '1';

  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: SignInInput) {
    setAuthError(null);
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setAuthError(error.message);
      setIsLoading(false);
      return;
    }

    router.push(WORKSPACE_PATH);
    router.refresh();
  }

  async function signInWithOAuth(provider: OAuthProvider) {
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

  const isBusy = isLoading || oauthPending !== null;
  const alert = authError ?? callbackError;

  return (
    <>
      <AuthHeader title="Sign in" subtitle="Welcome back. Your day is waiting." />

      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-5"
      >
        {accountDeleted && !alert ? (
          <p role="status" className="bg-fill-hover rounded-md px-3 py-2.5 text-(length:--cd-text-ui)">
            Your account and data were deleted.
          </p>
        ) : null}

        {alert ? <FormAlert>{alert}</FormAlert> : null}

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <AuthTextField
              {...field}
              id="sign-in-email"
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
              id="sign-in-password"
              label="Password"
              icon={Lock}
              type="password"
              revealable
              autoComplete="current-password"
              disabled={isBusy}
              error={fieldState.error?.message}
            />
          )}
        />

        <Link
          href="/auth/forgot-password"
          className="text-muted-foreground hover:text-foreground -mt-2 justify-self-end text-(length:--cd-text-meta) underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>

        <Button
          type="submit"
          className="mt-1 h-10 text-(length:--cd-text-control)"
          disabled={isBusy}
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>

        <AuthDivider />

        <OAuthButtons busy={isBusy} pending={oauthPending} onSelect={signInWithOAuth} />
      </form>

      <p className="text-muted-foreground mt-8 text-(length:--cd-text-ui)">
        New to Cadence?{' '}
        <Link
          href="/auth/sign-up"
          className="text-foreground decoration-primary/60 hover:decoration-primary font-medium underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
