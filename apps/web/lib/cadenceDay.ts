import type { DaySettings } from '@cadence/types';

import { getCadenceDayEndInstant } from './cadenceDate';

/**
 * When the current Cadence day ends.
 *
 * The boundary is the user's day end in their own time zone (like the database's
 * app_today). This used to set the hours in the browser's local timezone,
 * which put "day ends" and "time left" hours off for anyone outside IST.
 */
export function getCadenceDayEnd(currentTime: Date, settings: DaySettings): Date {
  return getCadenceDayEndInstant(currentTime, settings);
}
