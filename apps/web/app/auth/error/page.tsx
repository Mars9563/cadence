import Link from 'next/link';

import { AuthShell } from '@/features/auth/AuthShell';
import { AuthHeader } from '@/features/auth/AuthFormParts';

export default function AuthError() {
  return (
    <AuthShell
      headline="Something interrupted sign-in."
      lede="Nothing in your account changed."
    >
      <AuthHeader
        title="That didn’t work"
        subtitle="The sign-in link may have expired or been used already. Start again from the sign-in page."
      />

      <Link
        href="/auth/sign-in"
        className="bg-primary text-primary-foreground hover:bg-primary/85 inline-flex h-10 w-full items-center justify-center rounded-md text-(length:--cd-text-control) font-medium transition-colors"
      >
        Back to sign in
      </Link>
    </AuthShell>
  );
}
