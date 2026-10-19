'use client';

import { useState } from 'react';

import { scheduleDaySettings } from '@/api/profile';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/errors';
import { useDaySettings, useIsSocketConnected, useSetUser, useUser } from '@/store/selectors';

import { TimeZonePicker } from '../../time-zone/TimeZonePicker';
import { OfflineNote } from '../SettingsModal';

/** Choose the time zone; saving schedules it for the end of the current day. */
export function TimeZoneSection() {
  const user = useUser();
  const setUser = useSetUser();
  const isOnline = useIsSocketConnected();
  const daySettings = useDaySettings();

  const target = user?.pendingTimeZone ?? daySettings.timeZone;
  const [zone, setZone] = useState(target);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = isOnline && zone !== target && !saving;

  async function save() {
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
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) void save();
      }}
    >
      <label
        htmlFor="settings-time-zone"
        className="text-foreground text-(length:--cd-text-ui) font-medium"
      >
        Time zone
      </label>

      <TimeZonePicker
        id="settings-time-zone"
        value={zone}
        onChange={(next) => {
          setZone(next);
          setError(null);
        }}
        disabled={saving}
      />

      <div>
        <Button type="submit" size="sm" className="h-9" disabled={!canSave}>
          {saving ? 'Saving…' : 'Save time zone'}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
          {error}
        </p>
      ) : null}

      {!isOnline ? <OfflineNote /> : null}
    </form>
  );
}
