'use client';

import { useEffect } from 'react';

import { useCadenceToday } from '@/hooks/useCadenceToday';
import { daySettingsFor } from '@/lib/cadenceDate';
import { getCadenceDayEnd } from '@/lib/cadenceDay';
import {
  useEnsureTodayDailyNote,
  useSetCadenceDayEnd,
  useSetCurrentDateTime,
  useUser,
} from '@/store/selectors';

/**
 * The app-wide clock. Mounted once (by AppBootstrap) for the whole session.
 *
 * - Updates `currentDateTime` on every minute boundary, and immediately when
 *   the tab becomes visible again (timers stall while a laptop sleeps), so
 *   "today" is right in every view. It used to live inside the Dashboard's
 *   clock card, so the Notes view never saw the date change.
 * - When the Cadence day rolls over, makes sure the new day's Daily Note
 *   exists (it used to be created only at page load).
 * - Ticks once more exactly when a pending time zone / day end change takes
 *   effect, so "today" switches on time.
 */
export function AppClock() {
  const user = useUser();
  const today = useCadenceToday();

  const setCurrentTime = useSetCurrentDateTime();
  const setCadenceDayEnd = useSetCadenceDayEnd();
  const ensureTodayDailyNote = useEnsureTodayDailyNote();

  useEffect(() => {
    if (!user) {
      return;
    }

    const updateClock = () => {
      const now = new Date();

      setCurrentTime(now);
      setCadenceDayEnd(getCadenceDayEnd(now, daySettingsFor(user, now)));
    };

    updateClock();

    // Align ticks to the minute boundary (22:31:42 -> next tick at 22:32:00).
    const now = new Date();
    const millisecondsUntilNextMinute =
      60_000 - (now.getSeconds() * 1_000 + now.getMilliseconds());

    let interval: ReturnType<typeof setInterval> | undefined;

    const timeout = setTimeout(() => {
      updateClock();
      interval = setInterval(updateClock, 60_000);
    }, millisecondsUntilNextMinute);

    // A scheduled change: tick right when it takes effect.
    const untilPending = user.pendingEffectiveAt
      ? Date.parse(user.pendingEffectiveAt) - Date.now()
      : -1;

    const pendingTimeout =
      untilPending > 0
        ? setTimeout(updateClock, Math.min(untilPending + 50, 2_147_000_000))
        : undefined;

    const handleVisible = () => {
      if (document.visibilityState === 'visible') updateClock();
    };

    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      clearTimeout(timeout);
      if (pendingTimeout) clearTimeout(pendingTimeout);
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [user, setCurrentTime, setCadenceDayEnd]);

  // A new Cadence day: make sure its Daily Note exists.
  useEffect(() => {
    ensureTodayDailyNote(today);
  }, [today, ensureTodayDailyNote]);

  return null;
}
