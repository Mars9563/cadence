import { Suspense } from 'react';

import { AuthShell } from '@/features/auth/AuthShell';
import { SignInForm } from '@/features/auth/SignInForm';

export default function SignIn() {
  return (
    <AuthShell
      headline="Pick up where you left off."
      lede="Your habits, tasks and notes, right where you left them."
    >
      {/* SignInForm reads ?error= from the OAuth callback. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
