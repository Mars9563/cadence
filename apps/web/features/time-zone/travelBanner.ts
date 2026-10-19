import type { Profile } from '@cadence/types';

import { normalizeZone } from './zones';

export const TRAVEL_BANNER_DISMISSED_KEY = 'cadence:travel-banner-dismissed';

/**
 * Offer to switch when the device is in a different zone from the one
 * Cadence will use (the pending one if a change is scheduled), unless the
 * user already said "Not now" for that zone.
 */
export function shouldShowTravelBanner(
  deviceZone: string,
  profile: Pick<Profile, 'timeZone' | 'pendingTimeZone'>,
  dismissed: string[],
): boolean {
  const device = normalizeZone(deviceZone);
  const target = normalizeZone(profile.pendingTimeZone ?? profile.timeZone);

  return device !== target && !dismissed.includes(device);
}

export function readDismissedZones(): string[] {
  try {
    const raw = localStorage.getItem(TRAVEL_BANNER_DISMISSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((z): z is string => typeof z === 'string') : [];
  } catch {
    return [];
  }
}

export function dismissZone(zone: string): void {
  try {
    const zones = new Set(readDismissedZones());
    zones.add(normalizeZone(zone));
    localStorage.setItem(TRAVEL_BANNER_DISMISSED_KEY, JSON.stringify([...zones]));
  } catch {
    // Storage unavailable: the banner just comes back next time.
  }
}
