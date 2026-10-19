import { AuthShell } from '@/features/auth/AuthShell';
import { UpdatePasswordForm } from '@/features/auth/UpdatePasswordForm';

export default function UpdatePassword() {
  return (
    <AuthShell headline="A fresh start." lede="Pick a new password and you’re back in.">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
