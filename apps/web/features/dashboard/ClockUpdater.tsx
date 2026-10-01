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

    updateClock();

    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, [user?.dayEndTime, setCurrentTime, setCadenceDayEnd]);

  return null;
}
