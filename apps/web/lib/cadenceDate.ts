/**
 * Cadence date helpers (frontend mirror of public.cadence_date_of / app_today).
 *
 * SQL:  cadence_date = ((instant at time zone 'Asia/Kolkata') - day_end_time)::date
 *
 * Asia/Kolkata is a fixed UTC+05:30 with no DST, so a constant offset is exact.
 * All dates are 'YYYY-MM-DD' strings; they are compared as strings, never
 * through local-time Date parsing.
 */

export const DEFAULT_DAY_END_TIME = '04:00:00';

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** 'HH:MM' | 'HH:MM:SS' (| fractional seconds) -> milliseconds since 00:00. */
function timeToMs(value: string): number {
  const [hours = '0', minutes = '0', seconds = '0'] = value.split(':');
  return (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000;
}

/** The Cadence date that contains the instant `at`. */
export function getCadenceDate(
  at: Date,
  dayEndTime: string = DEFAULT_DAY_END_TIME,
): string {
  const shifted = at.getTime() + IST_OFFSET_MS - timeToMs(dayEndTime);
  return new Date(shifted).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' + n days (n may be negative). */
export function addDays(date: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/**
 * The instant the Cadence day containing `at` ends: the next calendar date
 * at `dayEndTime`, Asia/Kolkata. Mirrors the database rule exactly, whatever
 * the browser's own timezone is.
 */
export function getCadenceDayEndInstant(
  at: Date,
  dayEndTime: string = DEFAULT_DAY_END_TIME,
): Date {
  const [year = 1970, month = 1, day = 1] = getCadenceDate(at, dayEndTime)
    .split('-')
    .map(Number);

  const nextMidnightIstAsUtc = Date.UTC(year, month - 1, day + 1);

  return new Date(nextMidnightIstAsUtc + timeToMs(dayEndTime) - IST_OFFSET_MS);
}
