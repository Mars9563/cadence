import { Profile } from '@cadence/types';

import { createSupabaseClient } from '../supabase/supabase.js';

export async function getProfileByUserId(
  userId: string,
  accessToken: string,
): Promise<Profile | null> {

  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch profile:', error);
    throw new Error('PROFILE_FETCH_FAILED');
  }

  return data;
}
