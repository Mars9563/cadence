'use client';

import { useEffect } from 'react';

import {
  useSetCadenceDayEnd,
  useSetCurrentDateTime,
  useUser,
} from '@/store/selectors';

import { getCadenceDayEnd } from '@/lib/cadenceDay';

export function ClockUpdater() {
  const user = useUser();

  const setCurrentTime = useSetCurrentDateTime();
  const setCadenceDayEnd = useSetCadenceDayEnd();

  useEffect(() => {
    if (!user?.dayEndTime) {
      return;
    }

    const updateClock = () => {
      const now = new Date();

      setCurrentTime(now);
      setCadenceDayEnd(getCadenceDayEnd(now, user.dayEndTime));
    };

    // Initial update immediately.
    updateClock();

    /*
     * Wait until the next minute boundary.
     *
     * Example:
     * 22:31:42.500
     *
     * waits ~17.5 seconds
     *
     * then updates at:
     * 22:32:00
     */
    const now = new Date();

    const millisecondsUntilNextMinute =
      60_000 - (now.getSeconds() * 1_000 + now.getMilliseconds());

    let interval: ReturnType<typeof setInterval> | undefined;

    const timeout = setTimeout(() => {
      updateClock();

      interval = setInterval(updateClock, 60_000);
    }, millisecondsUntilNextMinute);

    return () => {
      clearTimeout(timeout);

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user?.dayEndTime, setCurrentTime, setCadenceDayEnd]);

  return null;
}
