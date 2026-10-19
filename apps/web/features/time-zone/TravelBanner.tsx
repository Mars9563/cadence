'use client';

import { useEffect, useState } from 'react';

import { scheduleDaySettings } from '@/api/profile';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/errors';
import { useDaySettings, useIsSocketConnected, useSetUser, useUser } from '@/store/selectors';

import { dismissZone, readDismissedZones, shouldShowTravelBanner } from './travelBanner';
import { detectTimeZone, zoneLabel } from './zones';

/**
 * "Your device is in <zone>. Use it for Cadence?" when the device's zone
 * differs from Cadence's. Switch schedules the change (it starts when the
 * current day ends); Not now hides it for that zone on this device.
 */
export function TravelBanner() {
  const user = useUser();
  const setUser = useSetUser();
  const isOnline = useIsSocketConnected();
  const daySettings = useDaySettings();

  const [deviceZone, setDeviceZone] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read on the client only, and again when the tab comes back (after a flight).
  useEffect(() => {
    const read = () => {
      setDeviceZone(detectTimeZone());
      setDismissed(readDismissedZones());
    };

    read();

    const onVisible = () => {
      if (document.visibilityState === 'visible') read();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  if (!user || !deviceZone || !shouldShowTravelBanner(deviceZone, user, dismissed)) {
    return null;
  }

  const zone = deviceZone;

  async function switchZone() {
    setError(null);
    setSaving(true);

    try {
      setUser(
        await scheduleDaySettings({
          timeZone: zone,
          dayEndTime: user?.pendingDayEndTime ?? daySettings.dayEndTime,
        }),
      );
    } catch (caught) {
      setError(toUserMessage(caught, 'The time zone couldn’t be changed. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Time zone"
      className="bg-surface-raised border-border fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-40 mx-auto grid max-w-md gap-3 rounded-lg border p-4 shadow-[var(--cd-shadow-popover)] md:bottom-4"
    >
      <p className="text-(length:--cd-text-ui)">
        Your device is in <span className="font-medium">{zoneLabel(zone)}</span>. Use it for
        Cadence? It starts when your current day ends.
      </p>

      {error ? (
        <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => {
            dismissZone(zone);
            setDismissed(readDismissedZones());
          }}
        >
          Not now
        </Button>
        <Button size="sm" disabled={saving || !isOnline} onClick={() => void switchZone()}>
          {saving ? 'Switching…' : 'Switch'}
        </Button>
      </div>
    </div>
  );
}
