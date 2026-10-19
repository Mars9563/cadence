import { AuthShell } from '@/features/auth/AuthShell';
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm';

export default function ForgotPassword() {
  return (
    <AuthShell headline="Locked out? It happens." lede="Get a link to set a new password.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
