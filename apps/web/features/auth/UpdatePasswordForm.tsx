'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import { WORKSPACE_PATH } from '@/lib/routes';
import { createClient } from '@/lib/supabase/client';

import { AuthHeader, AuthTextField, FormAlert } from './AuthFormParts';

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Enter your password again.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords don’t match.',
  });

type Input = z.infer<typeof schema>;

/**
 * Choose a new password. Reached from a reset link (/auth/confirm signs the
 * user in first) or from Settings while signed in.
 */
export function UpdatePasswordForm() {
  const supabase = createClient();
  const router = useRouter();

  const [session, setSession] = useState<'checking' | 'yes' | 'no'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setSession(data.user ? 'yes' : 'no'));
  }, [supabase]);

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const isBusy = form.formState.isSubmitting;

  async function onSubmit({ password }: Input) {
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    toast.success('Password updated.');
    router.push(WORKSPACE_PATH);
  }

  if (session === 'no') {
    return (
      <>
        <AuthHeader title="Link expired" subtitle="This reset link has expired or was already used." />
        <Link href="/auth/forgot-password" className={buttonVariants({ className: 'h-10' })}>
          Request a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeader title="Choose a new password" subtitle="At least 8 characters." />

      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        {error ? <FormAlert>{error}</FormAlert> : null}

        {(['password', 'confirmPassword'] as const).map((name) => (
          <Controller
            key={name}
            name={name}
            control={form.control}
            render={({ field, fieldState }) => (
              <AuthTextField
                {...field}
                id={`update-${name}`}
                label={name === 'password' ? 'New password' : 'Confirm new password'}
                icon={Lock}
                type="password"
                revealable
                autoComplete="new-password"
                disabled={isBusy || session === 'checking'}
                error={fieldState.error?.message}
              />
            )}
          />
        ))}

        <Button
          type="submit"
          className="mt-1 h-10 text-(length:--cd-text-control)"
          disabled={isBusy || session === 'checking'}
        >
          {isBusy ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </>
  );
}
