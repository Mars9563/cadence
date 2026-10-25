import type { Metadata } from 'next';

import { LandingPage } from '@/features/landing/LandingPage';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Cadence · A calm daily workspace',
  description:
    'Habits, tasks, a daily journal and notes in one quiet place. Works offline and on your phone.',
};

/** The public home page. Signed-in visitors get "Open workspace" instead of sign-up. */
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return <LandingPage signedIn={Boolean(data?.claims)} />;
}
