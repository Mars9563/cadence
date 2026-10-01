'use client';

import { useEffect } from 'react';
import { useSetCurrentDateTime } from '@/store/selectors';

export function ClockUpdater() {
  const setCurrentTime = useSetCurrentDateTime();

  useEffect(() => {
    // Set immediately
    setCurrentTime(new Date());

    // Then update every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [setCurrentTime]);

  return null;
}
