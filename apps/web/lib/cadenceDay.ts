import { getCadenceDayEndInstant } from './cadenceDate';

/**
 * When the current Cadence day ends.
 *
 * The boundary is `dayEndTime` in Asia/Kolkata (like the database's
 * app_today). This used to set the hours in the browser's local timezone,
 * which put "day ends" and "time left" hours off for anyone outside IST.
 */
export function getCadenceDayEnd(currentTime: Date, dayEndTime: string): Date {
  return getCadenceDayEndInstant(currentTime, dayEndTime);
}
