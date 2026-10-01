// src/lib/supabase/access-token.ts

import { createClient } from './client';

export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session.access_token;
}
