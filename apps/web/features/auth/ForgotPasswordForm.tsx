'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

import { AuthHeader, AuthTextField, FormAlert } from './AuthFormParts';

const schema = z.object({
  email: z.email('Enter a valid email address.'),
});

type Input = z.infer<typeof schema>;

/**
 * Ask for a reset link. The reply never says whether an account exists for
 * the address (Supabase answers the same either way), so nobody can use this
 * form to find out who has an account.
 */
export function ForgotPasswordForm() {
  const supabase = createClient();

  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Input>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const isBusy = form.formState.isSubmitting;

  async function onSubmit({ email }: Input) {
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
    });

    // Rate limits are worth showing; everything else gets the same answer.
    if (resetError && resetError.status === 429) {
      setError('Too many requests. Wait a minute and try again.');
      return;
    }

    setSentTo(email);
  }

  return (
    <>
      <AuthHeader
        title="Reset your password"
        subtitle="We’ll email you a link to choose a new one."
      />

      {sentTo ? (
        <div className="grid gap-5">
          <FormAlert>
            If an account exists for {sentTo}, a reset link is on its way. It works once and
            expires after a while.
          </FormAlert>
          <Button variant="outline" className="h-10" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
          {error ? <FormAlert>{error}</FormAlert> : null}

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <AuthTextField
                {...field}
                id="forgot-email"
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

          <Button type="submit" className="mt-1 h-10 text-(length:--cd-text-control)" disabled={isBusy}>
            {isBusy ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}

      <p className="text-muted-foreground mt-8 text-(length:--cd-text-ui)">
        Remembered it?{' '}
        <Link
          href="/auth/sign-in"
          className="text-foreground decoration-primary/60 hover:decoration-primary font-medium underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
