'use client';

import { useState } from 'react';

import { cancelPendingDaySettings } from '@/api/profile';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/errors';
import { useIsSocketConnected, useSetUser, useUser } from '@/store/selectors';

import { describePending } from '../time-zone/daySettingsUi';

/** The scheduled time zone / day end change, with Cancel. Nothing if none. */
export function PendingDaySettings() {
  const user = useUser();
  const setUser = useSetUser();
  const isOnline = useIsSocketConnected();

  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const line = user ? describePending(user) : null;

  if (!line) return null;

  async function cancel() {
    setError(null);
    setCancelling(true);

    try {
      setUser(await cancelPendingDaySettings());
    } catch (caught) {
      setError(toUserMessage(caught, 'The change couldn’t be cancelled. Try again.'));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="bg-fill-hover grid gap-2 rounded-md px-4 py-3" role="status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-(length:--cd-text-ui)">{line}</p>
        <Button
          variant="outline"
          size="sm"
          disabled={cancelling || !isOnline}
          onClick={() => void cancel()}
        >
          {cancelling ? 'Cancelling…' : 'Cancel'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
