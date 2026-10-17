import { AuthShell } from '@/features/auth/AuthShell';
import { SignUpForm } from '@/features/auth/SignUpForm';

export default function SignUp() {
  return (
    <AuthShell
      headline="Build a rhythm that lasts."
      lede="Track what matters, write down what you learn, and keep your days in step."
    >
      <SignUpForm />
    </AuthShell>
  );
}
