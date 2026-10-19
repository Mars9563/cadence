'use client';

import { useMemo, useState } from 'react';

import { scheduleDaySettings } from '@/api/profile';
import { Button } from '@/components/ui/button';
import { useCadenceToday } from '@/hooks/useCadenceToday';
import { toUserMessage } from '@/lib/errors';
import { formatCadenceDate } from '@/lib/history';
import { useDaySettings, useIsSocketConnected, useSetUser, useUser } from '@/store/selectors';

import { DAY_END_OPTIONS } from '../../time-zone/daySettingsUi';
import { OfflineNote } from '../SettingsModal';

const OPTIONS = DAY_END_OPTIONS;

const toHhMm = (value: string) => value.slice(0, 5);

export function DayBoundarySection() {
  const setUser = useSetUser();
  const isOnline = useIsSocketConnected();
  const today = useCadenceToday();

  const user = useUser();
  const daySettings = useDaySettings();
  const current = toHhMm(user?.pendingDayEndTime ?? daySettings.dayEndTime);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // A boundary saved before the 30-minute steps (e.g. 04:15) stays selectable.
  const options = useMemo(
    () => (OPTIONS.includes(current) ? OPTIONS : [...OPTIONS, current].sort()),
    [current],
  );

  const canSave = isOnline && value !== current && !saving;

  async function save() {
    setError(null);
    setSaving(true);

    try {
      setUser(
        await scheduleDaySettings({
          timeZone: user?.pendingTimeZone ?? daySettings.timeZone,
          dayEndTime: `${value}:00`,
        }),
      );
      setJustSaved(true);
    } catch (caught) {
      // The server explains a refusal (e.g. out of range) in plain words.
      setError(toUserMessage(caught, 'The day boundary couldn’t be changed. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) void save();
        }}
      >
        <label
          htmlFor="settings-day-end"
          className="text-foreground text-(length:--cd-text-ui) font-medium"
        >
          Day ends at
        </label>

        <div className="flex gap-2">
          <select
            id="settings-day-end"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setJustSaved(false);
              setError(null);
            }}
            className="border-input bg-background/60 text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-36 rounded-md border px-2.5 text-(length:--cd-text-control) tabular-nums outline-none focus-visible:ring-3"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
                {option === current ? ' (saved)' : ''}
              </option>
            ))}
          </select>

          <Button type="submit" size="sm" className="h-9" disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        <p className="text-muted-foreground text-(length:--cd-text-meta)" role="status">
          {justSaved && value === current
            ? `Saved. Today is ${formatCadenceDate(today)}.`
            : `Today is ${formatCadenceDate(today)}.`}
        </p>

        {error ? (
          <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
            {error}
          </p>
        ) : null}

        {!isOnline ? <OfflineNote /> : null}
      </form>

      <div className="bg-fill-hover text-muted-foreground grid gap-2 rounded-md px-4 py-3 text-(length:--cd-text-ui) leading-relaxed">
        <p>
          Any time between 00:00 and 08:00. A later time suits late nights:
          with 04:00, working at 02:00 still counts as the day before.
        </p>
        <p>
          A new time starts once your current day is over, so yesterday can’t
          be reopened and today can’t be cut short.
        </p>
      </div>
    </div>
  );
}
