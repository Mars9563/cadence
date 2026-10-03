import { useMemo } from 'react';

import { getCadenceDate } from '@/lib/cadenceDate';
import { useCurrentDateTime, useDayEndTime } from '@/store/selectors';

/**
 * The user's current Cadence date ('YYYY-MM-DD'), derived from the store's
 * `currentDateTime` and the profile's day boundary.
 *
 * It only moves forward when `currentDateTime` is updated in the store.
 */
export function useCadenceToday(): string {
  const now = useCurrentDateTime();
  const dayEndTime = useDayEndTime();

  return useMemo(() => getCadenceDate(now, dayEndTime), [now, dayEndTime]);
}
