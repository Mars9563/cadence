import { redirect } from 'next/navigation';

import { WORKSPACE_PATH } from '@/lib/routes';

/**
 * The public home page will live here. Until it exists, `/` forwards to the
 * app (signed-out visitors are sent to sign-in by proxy.ts first).
 */
export default function Home() {
  redirect(WORKSPACE_PATH);
}
