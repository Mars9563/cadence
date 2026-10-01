import * as z from 'zod';

export const uuidSchema = z.uuid();

export const dateSchema = z.iso.date();

/**
 * Time of day: `HH:MM` or `HH:MM:SS` (fractional seconds allowed).
 *
 * This used to be `z.iso.time({ precision: -1 })`, which accepts `HH:MM` ONLY.
 * PostgreSQL returns `time` columns as `HH:MM:SS`, so a value read from the
 * server (profiles.day_end_time, items.scheduled_time) failed validation the
 * moment it was sent back. With no `precision` option both forms are valid and
 * nothing else changes: `4:00`, `24:00`, `04:60` and offsets are still rejected.
 *
 * Display code that needs `HH:MM` (an <input type="time">) should slice, not
 * re-validate.
 */
export const timeSchema = z.iso.time();

/**
 * Seconds since 00:00:00 for a value that already passed `timeSchema`.
 * Fractional seconds are kept, so `08:00:00.5` is greater than `08:00:00`.
 */
export function timeToSeconds(value: string): number {
  const [hours = '0', minutes = '0', seconds = '0'] = value.split(':');
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

export const timestampSchema = z.iso.datetime({
  offset: true,
});

export const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required.')
  .max(200, 'Title must be 200 characters or fewer.');

export const descriptionSchema = z
  .string()
  .max(5000, 'Description must be 5000 characters or fewer.')
  .nullable()
  .optional();
