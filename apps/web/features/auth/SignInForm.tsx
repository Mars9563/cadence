'use client';

import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { FaGithub, FaGoogle } from 'react-icons/fa';
import { HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi';

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

const signInSchema = z.object({
  email: z.email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type SignInInput = z.infer<typeof signInSchema>;

export function SignInForm() {
  const supabase = createClient();
  const router = useRouter();

  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(
    null,
  );

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
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

      toast.error('Sign in failed', {
        description: error.message,
      });

      setIsLoading(false);
      return;
    }

    toast.success('Signed in successfully', {
      description: 'Welcome back to Cadence.',
    });

    router.push('/');
    router.refresh();
  }

  async function signInWithOAuth(provider: 'google' | 'github') {
    setAuthError(null);
    setOauthLoading(provider);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
    console.log('OAuth URL:', data?.url);

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
      id="sign-in-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full space-y-6"
    >
      <FieldGroup className="gap-5">
        {/* Email */}
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>

              <div className="relative">
                <HiOutlineMail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />

                <Input
                  {...field}
                  id="sign-in-email"
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
              <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>

              <div className="relative">
                <HiOutlineLockClosed className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />

                <Input
                  {...field}
                  id="sign-in-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
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

      {/* Sign in */}
      <Button type="submit" className="h-11 w-full" disabled={isBusy}>
        {isLoading ? 'Signing in...' : 'Sign in'}
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
          onClick={() => signInWithOAuth('google')}
        >
          <FaGoogle />
          {oauthLoading === 'google' ? 'Connecting...' : 'Google'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={isBusy}
          onClick={() => signInWithOAuth('github')}
        >
          <FaGithub />
          {oauthLoading === 'github' ? 'Connecting...' : 'GitHub'}
        </Button>
      </div>

      {/* Signup */}
      <p className="text-muted-foreground text-center text-sm">
        Don't have an account?{' '}
        <Link
          href="/auth/sign-up"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
