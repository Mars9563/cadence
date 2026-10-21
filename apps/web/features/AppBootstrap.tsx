'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { getProfile } from '@/api/profile';
import { ApiError, isRetryableError } from '@/lib/api/request';
import { daySettingsFor, getCadenceDate } from '@/lib/cadenceDate';
import { getCadenceDayEnd } from '@/lib/cadenceDay';
import { toUserMessage } from '@/lib/errors';
import { hardNavigate } from '@/lib/navigation';
import { needsOnboarding } from '@/lib/onboarding';
import { applyTheme } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';
import { useCadenceStore } from '@/store/store';
import { useAppReady, useDisconnectSocket, useUser } from '@/store/selectors';

import { AppClock } from './AppClock';
import { OnboardingScreen } from './onboarding/OnboardingScreen';
import { LoadingScreen, type LoadPhase } from './LoadingScreen/loadingScreen';

interface AppBootstrapProps {
  children: ReactNode;
}

/** How long the loader takes to hand over to the app (matches its CSS). */
const LOADER_EXIT_MS = 450;

/**
 * Loads everything the first screen needs, once per page session.
 *
 *   session  -> Supabase session (else: sign-in page); socket starts
 *   profile  -> the user's day boundary; nothing works without it
 *   data     -> items, habit completions, notes tree, daily notes
 *   sync     -> this device's unsynced changes are laid over the data and
 *               sent; today's Daily Note is ensured
 *
 * The full-screen loader exists only until the first successful load
 * (`appReady`). After that the app never unmounts for connectivity: losing
 * the connection shows a status, editing continues, and changes sync when
 * the socket reconnects (store/slices/syncSlice).
 *
 * A failed collection (say, items) does not block the app; its section shows
 * the error and the next reconnect re-reads it. Only the profile is
 * required. Offline at first load: the loader says so and retries by itself
 * when the browser reports the network back.
 */
export function AppBootstrap({ children }: AppBootstrapProps) {
  const appReady = useAppReady();
  const showOnboarding = needsOnboarding(useUser());
  const disconnectSocket = useDisconnectSocket();

  const [phase, setPhase] = useState<LoadPhase>({ kind: 'step', step: 'session' });
  const [attempt, setAttempt] = useState(0);
  const [loaderMounted, setLoaderMounted] = useState(!appReady);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // The socket lives for the whole page session, across load retries.
  const socketStartedRef = useRef(false);

  useEffect(() => () => disconnectSocket(), [disconnectSocket]);

  useEffect(() => {
    if (useCadenceStore.getState().appReady) return;

    let cancelled = false;
    const store = () => useCadenceStore.getState();

    async function load() {
      // 1. Session.
      setPhase({ kind: 'step', step: 'session' });

      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;

      if (cancelled) return;

      if (!token) {
        hardNavigate('/auth/sign-in');
        return;
      }

      if (!socketStartedRef.current) {
        socketStartedRef.current = true;
        store().connectSocket(token);
      }

      // 2. Profile (required).
      setPhase({ kind: 'step', step: 'profile' });

      const profile = await getProfile();

      if (cancelled) return;

      const now = new Date();

      store().setCurrentDateTime(now);
      store().setUser(profile);
      // The account's theme wins over this device's cached one.
      if (profile.theme) applyTheme(profile.theme);
      store().setCadenceDayEnd(getCadenceDayEnd(now, daySettingsFor(profile, now)));

      // 3. Data. Each fetch records its own error; none of them throws.
      setPhase({ kind: 'step', step: 'data' });

      await Promise.all([
        store().fetchItems(),
        store().fetchHabitCompletions(),
        store().fetchNotesTree(),
        store().fetchDailyNotes(),
      ]);

      if (cancelled) return;

      // 4. This device's pending changes, then today's note.
      setPhase({ kind: 'step', step: 'sync' });

      store().loadSync(profile.id);
      // Not before first-time setup: the note would be dated in the default
      // zone, and setup would then schedule the zone instead of applying it.
      if (!needsOnboarding(profile)) {
        store().ensureTodayDailyNote(getCadenceDate(now, daySettingsFor(profile, now)));
      }

      setPhase({ kind: 'step', step: 'done' });
      store().setAppReady();
    }

    load().catch((error: unknown) => {
      if (cancelled) return;

      // No session, or the server rejected it: sign in again.
      if (error instanceof ApiError && error.status === 401) {
        hardNavigate('/auth/sign-in');
        return;
      }

      if (isRetryableError(error)) {
        setPhase({ kind: 'offline' });
        return;
      }

      setPhase({
        kind: 'error',
        message: toUserMessage(error, 'Cadence couldn’t load your account.'),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Offline at first load: try again the moment the network is back.
  useEffect(() => {
    if (phase.kind !== 'offline') return;

    const timer = setInterval(retry, 15_000);

    window.addEventListener('online', retry);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', retry);
    };
  }, [phase.kind, retry]);

  // Hand over: keep the loader on top briefly while it fades out.
  useEffect(() => {
    if (!appReady || !loaderMounted) return;

    const timer = setTimeout(() => setLoaderMounted(false), LOADER_EXIT_MS);

    return () => clearTimeout(timer);
  }, [appReady, loaderMounted]);

  return (
    <>
      {appReady ? (
        showOnboarding ? (
          <OnboardingScreen />
        ) : (
          <>
            <AppClock />
            {children}
          </>
        )
      ) : null}

      {loaderMounted ? (
        <LoadingScreen
          phase={appReady ? { kind: 'step', step: 'done' } : phase}
          exiting={appReady}
          onRetry={retry}
        />
      ) : null}
    </>
  );
}
