/*
 * PostgreSQL error codes surfaced through PostgREST, shared by the services.
 */

/** unique_violation — e.g. a create replayed with the same client id. */
export const PG_UNIQUE_VIOLATION = '23505';

/** foreign_key_violation — e.g. a parent folder that does not exist. */
export const PG_FOREIGN_KEY_VIOLATION = '23503';

/** raise_exception — thrown by our triggers (folder cycles). */
export const PG_RAISE_EXCEPTION = 'P0001';

/** insufficient_privilege — an RLS WITH CHECK rejected the row. */
export const PG_RLS_VIOLATION = '42501';

/** ISO weekday (1 = Monday ... 7 = Sunday) of a 'YYYY-MM-DD' date. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();

  return day === 0 ? 7 : day;
}
