import type { Profile, ThemeId } from '@cadence/types';
import type {
  DaySettingsInput,
  OnboardingInput,
  UpdateProfileDetailsInput,
} from '@cadence/validation';

import { createSupabaseClient } from '../supabase/supabase.js';

type DbProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_public_id?: string | null;
  day_end_time: string;
  time_zone: string;
  pending_time_zone: string | null;
  pending_day_end_time: string | null;
  pending_effective_at: string | null;
  onboarded_at: string | null;
  theme: ThemeId;
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
  time_zone,
  pending_time_zone,
  pending_day_end_time,
  pending_effective_at,
  onboarded_at,
  theme,
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
    timeZone: data.time_zone,
    pendingTimeZone: data.pending_time_zone,
    pendingDayEndTime: data.pending_day_end_time,
    pendingEffectiveAt: data.pending_effective_at,
    onboardedAt: data.onboarded_at,
    theme: data.theme,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** Codes the day-settings RPCs raise as their message (migration 004). */
const RPC_ERROR_CODES = [
  'INVALID_TIME_ZONE',
  'DAY_END_TIME_OUT_OF_RANGE',
  'ALREADY_ONBOARDED',
  'DISPLAY_NAME_INVALID',
] as const;

/**
 * Turn the database's own rules into specific codes:
 *   profiles_avatar_public_id_shape   -> AVATAR_NOT_OWNED (003)
 *   RPC messages (004)                -> the code itself
 */
function profileWriteError(error: { code?: string; message?: string }): Error {
  if (error.code === PG_CHECK_VIOLATION) {
    const message = error.message ?? '';

    if (message.includes('profiles_avatar_public_id_shape')) {
      return new Error('AVATAR_NOT_OWNED');
    }

    const code = RPC_ERROR_CODES.find((known) => message === known);
    if (code) return new Error(code);
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
    Pick<DbProfile, 'display_name' | 'avatar_public_id' | 'theme'>
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

/** Display name and/or theme. Time zone and day end go through the day-settings RPCs. */
export function updateProfileDetails(
  userId: string,
  accessToken: string,
  input: UpdateProfileDetailsInput,
): Promise<Profile> {
  return patchProfile(userId, accessToken, {
    ...(input.displayName !== undefined && { display_name: input.displayName }),
    ...(input.theme !== undefined && { theme: input.theme }),
  });
}

/** Call a day-settings RPC; each returns the caller's updated profile row. */
async function callProfileRpc(
  accessToken: string,
  fn: 'schedule_day_settings' | 'cancel_pending_day_settings' | 'complete_onboarding',
  args: Record<string, string> = {},
): Promise<Profile> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase.rpc(fn, args).single();

  if (error) throw profileWriteError(error);
  if (!data) throw new Error('PROFILE_NOT_FOUND');

  return mapDbProfile(data as DbProfile);
}

/**
 * Schedule a time zone / day end change. The database decides when it takes
 * effect (after the current day has ended under both settings), so it can
 * never reopen a closed day.
 */
export function scheduleDaySettings(
  accessToken: string,
  input: DaySettingsInput,
): Promise<Profile> {
  return callProfileRpc(accessToken, 'schedule_day_settings', {
    p_time_zone: input.timeZone,
    p_day_end_time: input.dayEndTime,
  });
}

/** Cancel a pending change (one already in effect stays). */
export function cancelPendingDaySettings(accessToken: string): Promise<Profile> {
  return callProfileRpc(accessToken, 'cancel_pending_day_settings');
}

/**
 * First-time setup. Applied at once for users with nothing dated yet,
 * otherwise scheduled like any other change.
 */
export function completeOnboarding(
  accessToken: string,
  input: OnboardingInput,
): Promise<Profile> {
  return callProfileRpc(accessToken, 'complete_onboarding', {
    p_time_zone: input.timeZone,
    p_day_end_time: input.dayEndTime,
    p_display_name: input.displayName,
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
