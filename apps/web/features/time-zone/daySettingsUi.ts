import type { Profile } from '@cadence/types';

import { zoneLabel } from './zones';

/** 00:00, 00:30, ... 08:00: the range the database allows. */
export const DAY_END_OPTIONS = Array.from({ length: 17 }, (_, index) => {
  const minutes = index * 30;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
});

export const SELECT_CLASS =
  'border-input bg-background/60 text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-2.5 text-(length:--cd-text-control) tabular-nums outline-none focus-visible:ring-3';

/** 'Tue 20 Oct, 09:30' in the given zone. */
export function formatInstant(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/**
 * 'Switches to London (Europe) · day ends 04:00 — from Tue 20 Oct, 09:30 Tokyo time',
 * the time shown in the user's current zone; null when nothing is pending.
 */
export function describePending(
  profile: Pick<
    Profile,
    'timeZone' | 'pendingTimeZone' | 'pendingDayEndTime' | 'pendingEffectiveAt'
  >,
): string | null {
  const { pendingTimeZone, pendingDayEndTime, pendingEffectiveAt } = profile;

  if (!pendingTimeZone || !pendingDayEndTime || !pendingEffectiveAt) return null;

  const currentCity = (profile.timeZone.split('/').pop() ?? profile.timeZone).replaceAll('_', ' ');

  return `Switches to ${zoneLabel(pendingTimeZone)} · day ends ${pendingDayEndTime.slice(0, 5)} — from ${formatInstant(pendingEffectiveAt, profile.timeZone)} ${currentCity} time`;
}
