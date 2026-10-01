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
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,

    dayEndTime: data.day_end_time,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
