import type { DaySettings, Profile } from '@cadence/types';

/**
 * Cadence date helpers: the browser's mirror of the database rule
 * (public.cadence_date_of / cadence_day_end, migration 004).
 *
 * SQL:  cadence_date = ((instant AT TIME ZONE zone) - day_end_time)::date
 *       day end of D  = ((D + 1) + day_end_time) AT TIME ZONE zone
 *
 * Zones are IANA names, so daylight saving applies. All dates are
 * 'YYYY-MM-DD' strings, compared as strings, never parsed as local time.
 * lib/cadenceDate.test.ts pins the results to Postgres's own answers.
 */

export const DEFAULT_DAY_SETTINGS: DaySettings = {
  timeZone: 'Asia/Kolkata',
  dayEndTime: '04:00:00',
};

const HOUR_MS = 60 * 60 * 1000;

/** 'HH:MM' | 'HH:MM:SS' (| fractional seconds) -> milliseconds since 00:00. */
function timeToMs(value: string): number {
  const [hours = '0', minutes = '0', seconds = '0'] = value.split(':');
  return (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }

  return formatter;
}

/** The wall-clock time in `timeZone` at instant `ms`, expressed as if it were UTC. */
function wallClockMs(ms: number, timeZone: string): number {
  const parts: Record<string, number> = {};

  for (const part of formatterFor(timeZone).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }

  const wholeSeconds = Date.UTC(
    parts.year ?? 1970,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );

  return wholeSeconds + (((ms % 1000) + 1000) % 1000);
}

/** UTC offset of `timeZone` at instant `ms`, in milliseconds. */
function offsetMs(ms: number, timeZone: string): number {
  return wallClockMs(ms, timeZone) - ms;
}

/**
 * The instant at which `timeZone`'s wall clock shows `localMs` (a wall time
 * written as if it were UTC). Matches Postgres for times that don't exist
 * (spring-forward gap) or exist twice (fall-back overlap): both resolve with
 * the smaller of the two offsets around the change, which for an overlap is
 * the later instant.
 */
function localToInstant(localMs: number, timeZone: string): number {
  const guess = localMs - offsetMs(localMs, timeZone);

  const offsets = [
    ...new Set([
      offsetMs(guess - 6 * HOUR_MS, timeZone),
      offsetMs(guess, timeZone),
      offsetMs(guess + 6 * HOUR_MS, timeZone),
    ]),
  ];

  const exact = offsets
    .map((offset) => localMs - offset)
    .filter((candidate) => wallClockMs(candidate, timeZone) === localMs);

  if (exact.length > 0) return Math.max(...exact);

  return localMs - Math.min(...offsets);
}

/** The Cadence date that contains the instant `at`. */
export function getCadenceDate(at: Date, settings: DaySettings): string {
  const local = wallClockMs(at.getTime(), settings.timeZone);
  return new Date(local - timeToMs(settings.dayEndTime)).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' + n days (n may be negative). */
export function addDays(date: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** The instant the Cadence day `date` ends (mirror of SQL cadence_day_end). */
export function cadenceDayEnd(settings: DaySettings, date: string): Date {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  const local = Date.UTC(year, month - 1, day + 1) + timeToMs(settings.dayEndTime);

  return new Date(localToInstant(local, settings.timeZone));
}

/** The instant the Cadence day containing `at` ends. */
export function getCadenceDayEndInstant(at: Date, settings: DaySettings): Date {
  return cadenceDayEnd(settings, getCadenceDate(at, settings));
}

type DaySettingsProfile = Pick<
  Profile,
  'timeZone' | 'dayEndTime' | 'pendingTimeZone' | 'pendingDayEndTime' | 'pendingEffectiveAt'
>;

/**
 * The settings in effect at `at`: the pending ones from `pendingEffectiveAt`
 * on (the database applies a due change the same way, before it is folded).
 */
export function effectiveDaySettings(profile: DaySettingsProfile, at: Date): DaySettings {
  const { pendingTimeZone, pendingDayEndTime, pendingEffectiveAt } = profile;

  if (
    pendingTimeZone &&
    pendingDayEndTime &&
    pendingEffectiveAt &&
    Date.parse(pendingEffectiveAt) <= at.getTime()
  ) {
    return { timeZone: pendingTimeZone, dayEndTime: pendingDayEndTime };
  }

  return { timeZone: profile.timeZone, dayEndTime: profile.dayEndTime };
}
