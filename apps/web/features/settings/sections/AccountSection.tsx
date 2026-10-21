'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/store/selectors';

import { AccountData } from '../AccountData';
import { SectionHeader } from '../SettingsModal';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

const PROVIDER_LABELS: Record<string, string> = {
  email: 'Email and password',
  google: 'Google',
  github: 'GitHub',
};

/**
 * Read-only for now: what the account is and how it signs in. Changing
 * email or password comes later (through Supabase Auth).
 */
export function AccountSection() {
  const user = useUser();
  const [providers, setProviders] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    // The session carries the linked sign-in methods; no network needed.
    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;

        const sessionUser = data.session?.user;
        const linked =
          sessionUser?.identities?.map((identity) => identity.provider) ??
          (sessionUser?.app_metadata?.providers as string[] | undefined) ??
          [];

        setProviders([...new Set(linked)]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const memberSince = user
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const rows: { label: string; value: string }[] = [
    { label: 'Email', value: user?.email ?? '—' },
    {
      label: 'Signs in with',
      value:
        providers === null
          ? '…'
          : providers.length
            ? providers.map((p) => PROVIDER_LABELS[p] ?? p).join(', ')
            : '—',
    },
    { label: 'Member since', value: memberSince },
  ];

  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Account"
        description="Your sign-in details. Changing your email isn’t available yet."
      />

      <dl className="divide-y divide-border/60 border-y border-border/60">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="text-muted-foreground text-(length:--cd-text-ui)">{row.label}</dt>
            <dd className="text-foreground truncate text-(length:--cd-text-ui)" title={row.value}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {providers?.includes('email') ? (
        <Link
          href="/auth/update-password"
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'justify-self-start' })}
        >
          Change password
        </Link>
      ) : null}

      <AccountData />
    </div>
  );
}
