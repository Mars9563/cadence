'use client';

import { ReactNode, useEffect } from 'react';

import { getProfile } from '@/api/profile';
import { getCadenceDayEnd } from '@/lib/cadenceDay';
import { createClient } from '@/lib/supabase/client';

import {
  useConnectSocket,
  useDisconnectSocket,
  useFetchHabitCompletions,
  useFetchItems,
  useHabitCompletionsStatus,
  useIsSocketConnected,
  useItemsStatus,
  useSetCadenceDayEnd,
  useSetCurrentDateTime,
  useSetUser,
  useUser,
} from '@/store/selectors';

interface AppBootstrapProps {
  children: ReactNode;
}

export function AppBootstrap({ children }: AppBootstrapProps) {
  const user = useUser();

  const itemsStatus = useItemsStatus();
  const habitCompletionsStatus = useHabitCompletionsStatus();

  const isSocketConnected = useIsSocketConnected();

  const setUser = useSetUser();
  const setCurrentDateTime = useSetCurrentDateTime();
  const setCadenceDayEnd = useSetCadenceDayEnd();

  const fetchItems = useFetchItems();
  const fetchHabitCompletions = useFetchHabitCompletions();

  const connectSocket = useConnectSocket();
  const disconnectSocket = useDisconnectSocket();

  useEffect(() => {
    async function loadProfile() {
      const profile = await getProfile();

      const now = new Date();

      setCurrentDateTime(now);
      setUser(profile);
      setCadenceDayEnd(getCadenceDayEnd(now, profile.dayEndTime));
    }

    async function connectSockets() {
      const supabase = createClient();

      const { data } = await supabase.auth.getSession();

      const token = data.session?.access_token;

      if (token) {
        connectSocket(token);
      }
    }

    // Load application data.
    void fetchItems();
    void fetchHabitCompletions();

    // Load profile.
    void loadProfile();

    // Start socket connection.
    void connectSockets();

    return () => {
      disconnectSocket();
    };
  }, [
    setUser,
    setCurrentDateTime,
    setCadenceDayEnd,
    fetchItems,
    fetchHabitCompletions,
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
    isSocketConnected;

  if (!isAppReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading Cadence…</p>
      </div>
    );
  }

  return <>{children}</>;
}
