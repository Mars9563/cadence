import * as z from 'zod';

import { timeSchema, timeToSeconds } from './common';

/**
 * Allowed range for `profiles.day_end_time`: 00:00:00 through 08:00:00 inclusive.
 *
 * MUST match `profiles_day_end_time_range` in supabase/schema.sql (migration 001).
 * The boundary is the moment a Cadence day rolls over; a late-evening value
 * would label every day with the calendar date it starts on.
 */
export const DAY_END_TIME_MIN_SECONDS = 0;
export const DAY_END_TIME_MAX_SECONDS = 8 * 60 * 60;

export const dayEndTimeSchema = timeSchema.refine(
  (value) => {
    const seconds = timeToSeconds(value);
    return (
      seconds >= DAY_END_TIME_MIN_SECONDS && seconds <= DAY_END_TIME_MAX_SECONDS
    );
  },
  { message: 'Day boundary must be between 00:00 and 08:00.' },
);

/**
 * An IANA time zone name. Only the shape is checked here; the database is
 * the authority on which names exist (is_valid_time_zone, migration 004).
 */
export const timeZoneSchema = z
  .string()
  .trim()
  .min(1, 'Choose a time zone.')
  .max(64, 'Time zone name is too long.');

/* ============================================================================
 * AVATARS (Cloudinary)
 * ========================================================================== */

/**
 * Cloudinary folder for user-uploaded avatars. Each user's images live in
 * `${AVATAR_FOLDER}/<user id>/`.
 *
 * MUST match `profiles_avatar_public_id_shape` in supabase/schema.sql
 * (migration 003), which rejects any public_id outside the row's own folder.
 */
export const AVATAR_FOLDER = 'profiles';

export const AVATAR_PUBLIC_ID_MAX_LENGTH = 255;

const AVATAR_PUBLIC_ID_PATTERN =
  /^profiles\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-]+$/;

/** Shape of an avatar public_id: `profiles/<uuid>/<name>`. */
export const avatarPublicIdSchema = z
  .string()
  .max(AVATAR_PUBLIC_ID_MAX_LENGTH, 'Avatar id is too long.')
  .regex(AVATAR_PUBLIC_ID_PATTERN, 'Avatar id is not in the avatars folder.');

/** The Cloudinary folder a user's avatars are uploaded to. */
export function avatarFolderFor(userId: string): string {
  return `${AVATAR_FOLDER}/${userId}`;
}

/**
 * True when `publicId` is a valid avatar id inside `userId`'s own folder.
 * The shape check alone cannot know whose folder it is; use this wherever
 * the user is known (e.g. before signing a URL or saving to the profile).
 */
export function isAvatarPublicIdOf(userId: string, publicId: string): boolean {
  return (
    avatarPublicIdSchema.safeParse(publicId).success &&
    publicId.startsWith(`${avatarFolderFor(userId)}/`)
  );
}

/* ============================================================================
 * PROFILE UPDATE
 * ========================================================================== */

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required.')
    .max(100, 'Display name must be 100 characters or fewer.')
    .nullable()
    .optional(),

  avatarUrl: z.url('Avatar URL must be a valid URL.').nullable().optional(),

  /**
   * Set after a signed Cloudinary upload, or null to remove the uploaded
   * avatar. Only the shape is checked here; the server must also check
   * ownership with isAvatarPublicIdOf (the database enforces it too).
   */
  avatarPublicId: avatarPublicIdSchema.nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/* ============================================================================
 * PROFILE ROUTES
 * ========================================================================== */

/**
 * PATCH /profile: the fields a user edits directly. Avatars have their own
 * routes (an avatar is only accepted after an upload the server signed),
 * email lives in Supabase Auth, and time zone / day end change only through
 * PUT /profile/day-settings, so none of those are accepted here.
 */
export const updateProfileDetailsSchema = z
  .strictObject({
    displayName: updateProfileSchema.shape.displayName,
  })
  .refine((value) => value.displayName !== undefined, {
    message: 'Provide displayName.',
  });

/** PUT /profile/day-settings: schedule a time zone / day end change. */
export const daySettingsSchema = z.strictObject({
  timeZone: timeZoneSchema,
  dayEndTime: dayEndTimeSchema,
});

/** POST /profile/onboarding: first-time setup. */
export const onboardingSchema = daySettingsSchema.extend({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required.')
    .max(100, 'Display name must be 100 characters or fewer.'),
});

/** PUT /profile/avatar: adopt an uploaded image as the avatar. */
export const setAvatarSchema = z.object({
  publicId: avatarPublicIdSchema,
});

/** Sizes the server will sign avatar URLs for (square, px). */
export const AVATAR_SIZES = [64, 128, 256, 512] as const;

export const avatarSizeSchema = z.coerce
  .number()
  .pipe(z.literal(AVATAR_SIZES, { error: 'Size must be 64, 128, 256 or 512.' }));

export type UpdateProfileDetailsInput = z.infer<typeof updateProfileDetailsSchema>;
export type DaySettingsInput = z.infer<typeof daySettingsSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type SetAvatarInput = z.infer<typeof setAvatarSchema>;
export type AvatarSize = (typeof AVATAR_SIZES)[number];
