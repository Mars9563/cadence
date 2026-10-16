'use client';

import { ReactNode, useEffect } from 'react';

import { getProfile } from '@/api/profile';
import { getCadenceDayEnd } from '@/lib/cadenceDay';
import { createClient } from '@/lib/supabase/client';

import {
  useConnectSocket,
  useDisconnectSocket,
  useEnsureTodayDailyNote,
  useFetchDailyNotes,
  useFetchHabitCompletions,
  useFetchItems,
  useFetchNotesTree,
  useHabitCompletionsStatus,
  useIsSocketConnected,
  useItemsStatus,
  useSetCadenceDayEnd,
  useSetCurrentDateTime,
  useSetUser,
  useUser,
  useDailyNotesStatus,
  useNotesStatus,
} from '@/store/selectors';
import { LoadingScreen } from './LoadingScreen/loadingScreen';

interface AppBootstrapProps {
  children: ReactNode;
}

/**
 * Returns the current Cadence date for the given instant.
 *
 * Cadence uses:
 *
 *   Asia/Kolkata
 *   minus the user's day_end_time
 *
 * and then takes the calendar date.
 *
 * This mirrors the database's app_today() calculation.
 */
function getCurrentCadenceDate(now: Date, dayEndTime: string): string {
  const [hours = '0', minutes = '0', seconds = '0'] = dayEndTime.split(':');

  const boundarySeconds =
    Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds);

  const istDateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const parts = Object.fromEntries(
    istDateParts.map(({ type, value }) => [type, value]),
  );

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);

  const currentSeconds = hour * 60 * 60 + minute * 60 + second;

  /*
   * Build the calendar date in UTC so that date arithmetic is independent
   * from the browser's local timezone.
   */
  const cadenceDate = new Date(Date.UTC(year, month - 1, day));

  if (currentSeconds < boundarySeconds) {
    cadenceDate.setUTCDate(cadenceDate.getUTCDate() - 1);
  }

  return cadenceDate.toISOString().slice(0, 10);
}

export function AppBootstrap({ children }: AppBootstrapProps) {
  const user = useUser();

  const itemsStatus = useItemsStatus();
  const habitCompletionsStatus = useHabitCompletionsStatus();
  const dailyNotesStatus = useDailyNotesStatus();
  const notesStatus = useNotesStatus();

  const isSocketConnected = useIsSocketConnected();

  const setUser = useSetUser();
  const setCurrentDateTime = useSetCurrentDateTime();
  const setCadenceDayEnd = useSetCadenceDayEnd();

  const fetchItems = useFetchItems();
  const fetchHabitCompletions = useFetchHabitCompletions();

  const fetchDailyNotes = useFetchDailyNotes();
  const ensureTodayDailyNote = useEnsureTodayDailyNote();

  const fetchNotesTree = useFetchNotesTree();

  const connectSocket = useConnectSocket();
  const disconnectSocket = useDisconnectSocket();

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const profile = await getProfile();

      if (cancelled) {
        return;
      }

      const now = new Date();

      setCurrentDateTime(now);
      setUser(profile);
      setCadenceDayEnd(getCadenceDayEnd(now, profile.dayEndTime));

      /*
       * Daily Notes depend on the user's Cadence date,
       * which depends on their profile day_end_time.
       *
       * Therefore we don't attempt to ensure today's note
       * until the profile has loaded.
       */
      await fetchDailyNotes();

      if (cancelled) {
        return;
      }

      const currentCadenceDate = getCurrentCadenceDate(now, profile.dayEndTime);

      await ensureTodayDailyNote(currentCadenceDate);
    }

    async function connectSockets() {
      const supabase = createClient();

      const { data } = await supabase.auth.getSession();

      const token = data.session?.access_token;

      if (token && !cancelled) {
        connectSocket(token);
      }
    }

    // Load application data.
    void fetchItems();
    void fetchHabitCompletions();

    // Load folders + note summaries (no note content).
    void fetchNotesTree();

    // Load profile + Daily Notes.
    void loadProfile();

    // Start socket connection.
    void connectSockets();

    return () => {
      cancelled = true;
      disconnectSocket();
    };
  }, [
    setUser,
    setCurrentDateTime,
    setCadenceDayEnd,
    fetchItems,
    fetchHabitCompletions,
    fetchDailyNotes,
    ensureTodayDailyNote,
    fetchNotesTree,
    connectSocket,
    disconnectSocket,
  ]);

  /*
   * Do not render the actual application until everything
   * required for the first screen is ready.
   */
  const isAppReady =
    user !== null &&
    itemsStatus === 'ready' &&
    habitCompletionsStatus === 'ready' &&
    dailyNotesStatus === 'ready' &&
    notesStatus === 'ready' &&
    isSocketConnected;

  if (!isAppReady) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
