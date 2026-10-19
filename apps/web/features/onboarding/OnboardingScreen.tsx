'use client';

import { useState } from 'react';

import type { ProfileView } from '@cadence/types';

import { completeOnboarding } from '@/api/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toUserMessage } from '@/lib/errors';
import { useSetUser, useUser } from '@/store/selectors';

import { DAY_END_OPTIONS, SELECT_CLASS, describePending } from '../time-zone/daySettingsUi';
import { TimeZonePicker } from '../time-zone/TimeZonePicker';
import { detectTimeZone } from '../time-zone/zones';

const NAME_MAX_LENGTH = 100;
const LABEL = 'text-foreground text-(length:--cd-text-ui) font-medium';

/**
 * First-time setup, shown instead of the workspace until the profile has
 * `onboardedAt`. Asks for the time zone (pre-filled from the device), when
 * the day ends and the display name.
 */
export function OnboardingScreen() {
  const user = useUser();
  const setUser = useSetUser();

  const [timeZone, setTimeZone] = useState(detectTimeZone);
  const [dayEnd, setDayEnd] = useState((user?.dayEndTime ?? '04:00:00').slice(0, 5));
  const [name, setName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Users with existing data get a scheduled change: say when it applies.
  const [scheduled, setScheduled] = useState<ProfileView | null>(null);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !saving;

  async function submit() {
    setError(null);
    setSaving(true);

    try {
      const profile = await completeOnboarding({
        timeZone,
        dayEndTime: `${dayEnd}:00`,
        displayName: trimmed,
      });

      if (profile.pendingEffectiveAt) setScheduled(profile);
      else setUser(profile);
    } catch (caught) {
      setError(toUserMessage(caught, 'Setup couldn’t be saved. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="bg-background text-foreground flex min-h-dvh items-start justify-center px-4 pt-[max(env(safe-area-inset-top),3rem)] pb-12 sm:items-center sm:pt-12">
      <div className="grid w-full max-w-md gap-7">
        <header className="grid gap-1.5">
          <h1 className="text-(length:--cd-text-title) font-semibold">Set up your day</h1>
          <p className="text-muted-foreground text-(length:--cd-text-ui)">
            Cadence counts each day in your own time. You can change these later in Settings.
          </p>
        </header>

        {scheduled ? (
          <section className="grid gap-4" aria-live="polite">
            <p className="bg-fill-hover rounded-md px-4 py-3 text-(length:--cd-text-ui) leading-relaxed">
              {describePending(scheduled)}. Until then your current day keeps its old settings, so
              nothing you’ve done moves to another day.
            </p>
            <Button onClick={() => setUser(scheduled)}>Continue</Button>
          </section>
        ) : (
          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) void submit();
            }}
          >
            <div className="grid gap-2">
              <label htmlFor="onboarding-zone" className={LABEL}>
                Time zone
              </label>
              <TimeZonePicker
                id="onboarding-zone"
                value={timeZone}
                onChange={setTimeZone}
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="onboarding-day-end" className={LABEL}>
                My day ends at
              </label>
              <select
                id="onboarding-day-end"
                value={dayEnd}
                disabled={saving}
                onChange={(event) => setDayEnd(event.target.value)}
                className={`${SELECT_CLASS} w-36`}
              >
                {DAY_END_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-(length:--cd-text-meta)">
                Anything you do before this still counts as the day before.
              </p>
            </div>

            <div className="grid gap-2">
              <label htmlFor="onboarding-name" className={LABEL}>
                Display name
              </label>
              <Input
                id="onboarding-name"
                value={name}
                maxLength={NAME_MAX_LENGTH}
                autoComplete="name"
                disabled={saving}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            {error ? (
              <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={!canSubmit}>
              {saving ? 'Saving…' : 'Start'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
