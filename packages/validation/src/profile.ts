import * as z from 'zod';

import { timeSchema, timeToSeconds } from './common';

/**
 * Allowed range for `profiles.day_end_time`: 00:00:00 through 08:00:00 inclusive.
 *
 * MUST match `profiles_day_end_time_range` in sql/001_cadence_fixes.sql.
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

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required.')
    .max(100, 'Display name must be 100 characters or fewer.')
    .nullable()
    .optional(),

  avatarUrl: z.url('Avatar URL must be a valid URL.').nullable().optional(),

  dayEndTime: dayEndTimeSchema.optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
