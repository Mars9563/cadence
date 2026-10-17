import type { Profile } from '@cadence/types';
import type { UpdateProfileDetailsInput } from '@cadence/validation';

import { createSupabaseClient } from '../supabase/supabase.js';

type DbProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_public_id?: string | null;
  day_end_time: string;
  created_at: string;
  updated_at: string;
};

const PROFILE_SELECT = `
  id,
  email,
  display_name,
  avatar_url,
  avatar_public_id,
  day_end_time,
  created_at,
  updated_at
`;

/** check_violation: a CHECK constraint, or a trigger raising with that code. */
const PG_CHECK_VIOLATION = '23514';

function mapDbProfile(data: DbProfile): Profile {
  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    avatarPublicId: data.avatar_public_id ?? null,
    dayEndTime: data.day_end_time,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Turn the database's own rules into specific codes:
 *   profiles_day_end_time_range       -> DAY_END_TIME_OUT_OF_RANGE (001)
 *   profiles_guard_day_end_time trg   -> DAY_END_TIME_MOVES_DATE_BACK (002)
 *   profiles_avatar_public_id_shape   -> AVATAR_NOT_OWNED (003)
 */
function profileWriteError(error: { code?: string; message?: string }): Error {
  if (error.code === PG_CHECK_VIOLATION) {
    const message = error.message ?? '';

    if (message.includes('profiles_avatar_public_id_shape')) {
      return new Error('AVATAR_NOT_OWNED');
    }

    if (message.includes('moves the current Cadence date backwards')) {
      return new Error('DAY_END_TIME_MOVES_DATE_BACK');
    }

    if (message.includes('profiles_day_end_time_range')) {
      return new Error('DAY_END_TIME_OUT_OF_RANGE');
    }
  }

  console.error('Failed to update profile:', error);
  return new Error('PROFILE_UPDATE_FAILED');
}

export async function getProfileByUserId(
  userId: string,
  accessToken: string,
): Promise<Profile | null> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch profile:', error);
    throw new Error('PROFILE_FETCH_FAILED');
  }

  return data ? mapDbProfile(data as DbProfile) : null;
}

/** Apply a column patch to the user's own row and return the result. */
async function patchProfile(
  userId: string,
  accessToken: string,
  changes: Partial<
    Pick<DbProfile, 'display_name' | 'day_end_time' | 'avatar_public_id'>
  >,
): Promise<Profile> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('profiles')
    .update(changes)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) throw profileWriteError(error);

  // RLS hides rows the caller does not own: no row back means no profile.
  if (!data) throw new Error('PROFILE_NOT_FOUND');

  return mapDbProfile(data as DbProfile);
}

/**
 * Display name and/or day boundary.
 *
 * The day boundary is guarded by the database: 00:00-08:00 only (001), and
 * never in a way that moves "today" to an earlier date (002), which would
 * reopen yesterday for completions.
 */
export function updateProfileDetails(
  userId: string,
  accessToken: string,
  input: UpdateProfileDetailsInput,
): Promise<Profile> {
  return patchProfile(userId, accessToken, {
    ...(input.displayName !== undefined && { display_name: input.displayName }),
    ...(input.dayEndTime !== undefined && { day_end_time: input.dayEndTime }),
  });
}

/**
 * Point the profile at an uploaded Cloudinary avatar. Returns the profile
 * and the public_id it replaced, so the caller can delete the old image.
 */
export async function setProfileAvatar(
  userId: string,
  accessToken: string,
  avatarPublicId: string,
): Promise<{ profile: Profile; previousPublicId: string | null }> {
  const current = await getProfileByUserId(userId, accessToken);

  if (!current) throw new Error('PROFILE_NOT_FOUND');

  const profile = await patchProfile(userId, accessToken, {
    avatar_public_id: avatarPublicId,
  });

  return {
    profile,
    previousPublicId:
      current.avatarPublicId !== avatarPublicId ? current.avatarPublicId : null,
  };
}

/**
 * Remove the uploaded avatar. The Google/GitHub picture (avatar_url) is
 * kept, so it shows again; it is never removed. Returns the public_id to
 * delete from Cloudinary.
 */
export async function clearProfileAvatar(
  userId: string,
  accessToken: string,
): Promise<{ profile: Profile; previousPublicId: string | null }> {
  const current = await getProfileByUserId(userId, accessToken);

  if (!current) throw new Error('PROFILE_NOT_FOUND');

  const profile = await patchProfile(userId, accessToken, {
    avatar_public_id: null,
  });

  return { profile, previousPublicId: current.avatarPublicId };
}
